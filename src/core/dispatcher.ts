import type { WebComponent } from './nodes.js'
import Reducers, { type State } from './reducers.js'
import Renderer from './renderer.js'
import type { AnyFunction } from './utils.js'

/* A map of command names to functions creating state transformations. */
export type CommandsAPI = Record<string, (...args: never[]) => StateUpdate>

export type StateUpdate = (state: State) => State

/* The commands available on components, core ones included. */
export type Commands = {
  setState(state: State): unknown
  update(overrides: State): unknown
  [name: string]: AnyFunction
}

const Mode = {
  QUEUE: Symbol('queue-commands'),
  EXECUTE: Symbol('execute-commands'),
  IGNORE: Symbol('ignore-commands'),
}

const coreAPI = {
  setState(state: State): StateUpdate {
    return () => state
  },
  update(overrides: State): StateUpdate {
    return state => ({
      ...state,
      ...overrides,
    })
  },
}

class Command {
  declare name: string
  declare args: unknown[]
  declare method: AnyFunction
  declare done?: (value?: unknown) => void

  constructor(name: string, args: unknown[], method: AnyFunction) {
    this.name = name
    this.args = args
    this.method = method
  }

  invoke(state: State | undefined): State {
    return (this.method(...this.args) as StateUpdate)(state as State)
  }
}

const createCommandsAPI = (...apis: CommandsAPI[]) => {
  const commandsAPI: CommandsAPI = {}
  for (const api of [coreAPI, ...apis]) {
    const defined = Object.keys(commandsAPI)
    const incoming = Object.keys(api)
    const overriden = incoming.find(key => defined.includes(key))
    if (overriden) {
      throw new Error(`The "${overriden}" command is already defined!`)
    }
    Object.assign(commandsAPI, api)
  }
  return commandsAPI
}

export type { Command }

class Dispatcher {
  declare mode: symbol
  declare queue: Command[]
  declare commands: Commands
  declare names: string[]

  queueIncoming() {
    this.mode = Mode.QUEUE
  }

  executeIncoming() {
    this.mode = Mode.EXECUTE
  }

  ignoreIncoming() {
    this.mode = Mode.IGNORE
  }

  execute(command: Command, root: WebComponent) {
    const prevState = root.state
    const nextState = command.invoke(prevState)
    root.state = nextState
    Renderer.update(root, prevState, nextState, command)
  }

  constructor(root: WebComponent) {
    this.mode = Mode.EXECUTE
    this.queue = []
    this.commands = {} as Commands

    let createCommand: (name: string, args: unknown[]) => Command

    const ComponentClass = root.constructor as typeof WebComponent
    if (typeof ComponentClass.getCommands === 'function') {
      const customAPI = ComponentClass.getCommands()
      if (!customAPI) {
        throw new Error('No API returned in getCommands() method')
      }
      const customAPIs = Array.isArray(customAPI) ? customAPI : [customAPI]
      const api = createCommandsAPI(...customAPIs)

      this.names = Object.keys(api)
      createCommand = (name, args) => new Command(name, args, api[name]!)
    } else {
      const reducers = root.getReducers ? root.getReducers() : []
      const combinedReducer = Reducers.combine(...reducers)
      const api = combinedReducer.commands

      this.names = Object.keys(api)
      createCommand = (name, args) =>
        new Command(
          name,
          args,
          () => (state: State) =>
            combinedReducer(
              state,
              api[name]!(...args) as Parameters<typeof combinedReducer>[1],
            ),
        )
    }

    this.mode = Mode.EXECUTE
    let level = 0

    for (const name of this.names) {
      this.commands[name] = (...args: unknown[]) => {
        const command = createCommand(name, args)

        if (this.mode === Mode.QUEUE) {
          const donePromise = new Promise(resolve => {
            command.done = resolve
          })
          this.queue.push(command)
          return donePromise
        }

        if (this.mode === Mode.IGNORE) {
          level = 0
          return false
        }

        this.execute(command, root)

        if (this.queue.length) {
          level = level + 1
          if (level > 3) {
            try {
              throw new Error(
                'Too many cycles updating state in lifecycle methods!',
              )
            } finally {
              level = 0
            }
          }
          const tasks = [...this.queue]
          setTimeout(() => {
            for (const command of tasks) {
              this.execute(command, root)
              command.done!()
            }
          })
          this.queue.length = 0
        } else {
          level = 0
          return true
        }
      }
    }
  }
}

export default Dispatcher
