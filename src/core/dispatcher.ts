import type { WebComponent } from './nodes.js'
import Reducers, { type State } from './reducers.js'
import Renderer from './renderer.js'
import type { AnyFunction } from './utils.js'

/* A state transformation returned by a command. */
export type StateUpdate<S = State> = (state: S) => S

/* A map of command names to functions creating state transformations. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- commands take any arguments
export type CommandsAPI = Record<string, (...args: any[]) => StateUpdate<any>>

/* The core commands available on every component. */
export type Commands<S = State> = {
  setState(state: S): unknown
  update(overrides: Partial<S>): unknown
}

/* The commands of an API, called with the arguments of the API methods. */
export type BoundCommands<C extends CommandsAPI> = {
  [K in keyof C]: (...args: Parameters<C[K]>) => unknown
}

const Mode = {
  QUEUE: Symbol('queue-commands'),
  EXECUTE: Symbol('execute-commands'),
  IGNORE: Symbol('ignore-commands'),
}

/* The limit of lifecycle methods queueing commands in response to others. */
const MAX_FLUSH_CYCLES = 3

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
    const overridden = incoming.find(key => defined.includes(key))
    if (overridden) {
      throw new Error(`The "${overridden}" command is already defined!`)
    }
    Object.assign(commandsAPI, api)
  }
  return commandsAPI
}

export type { Command }

class Dispatcher {
  declare mode: symbol
  declare queue: Command[]
  declare commands: Commands & Record<string, AnyFunction>
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
    const prevState = root.state as State | undefined
    const nextState = command.invoke(prevState)
    Renderer.update(root, prevState, nextState, command)
  }

  constructor(root: WebComponent) {
    this.mode = Mode.EXECUTE
    this.queue = []
    this.commands = {} as Commands & Record<string, AnyFunction>

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
          () => (state: State) => combinedReducer(state, api[name]!(...args)),
        )
    }

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
          return false
        }

        this.execute(command, root)

        if (!this.queue.length) {
          return true
        }
        const tasks = this.queue.splice(0)
        setTimeout(() => this.flush(tasks, root))
      }
    }
  }

  /**
   * Executes the commands queued by lifecycle methods, followed by the ones
   * these commands queue in turn, until there are none left.
   */
  flush(tasks: Command[], root: WebComponent) {
    let command: Command | undefined
    try {
      for (let cycle = 1; tasks.length; cycle++) {
        if (cycle > MAX_FLUSH_CYCLES) {
          throw new Error(
            'Too many cycles updating state in lifecycle methods!',
          )
        }
        while ((command = tasks.shift())) {
          // the root can be destroyed before the queued commands are executed
          if (this.mode === Mode.IGNORE) {
            command.done!(false)
            continue
          }
          this.execute(command, root)
          command.done!()
        }
        tasks = this.queue.splice(0)
      }
    } catch (error) {
      // the commands not executed resolve as ignored ones return
      for (const pending of [command, ...tasks, ...this.queue.splice(0)]) {
        pending?.done!(false)
      }
      throw error
    }
  }
}

export default Dispatcher
