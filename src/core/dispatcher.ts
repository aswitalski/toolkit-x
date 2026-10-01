import type { WebComponent } from './nodes.js'
import Renderer from './renderer.js'
import type { AnyFunction } from './utils.js'

/* The state of a root component. */
export type State = Record<string, unknown>

/* A state transformation returned by a command. */
export type StateUpdate<S = State> = (state: S) => S

/* A map of command names to functions creating state transformations. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- commands take any arguments
export type CommandsAPI = Record<string, (...args: any[]) => StateUpdate<any>>

/* The core commands available on every component. */
export type Commands<S = State> = {
  setState(state: S): Promise<boolean>
  update(overrides: Partial<S>): Promise<boolean>
}

/*
 * The commands of an API, called with the arguments of the API methods.
 * They resolve with true once rendered, or with false when ignored.
 */
export type BoundCommands<C extends CommandsAPI> = {
  [K in keyof C]: (...args: Parameters<C[K]>) => Promise<boolean>
}

const Mode = {
  EXECUTE: Symbol('execute-commands'),
  IGNORE: Symbol('ignore-commands'),
}

/*
 * The limit of updates in a row, the one with the commands issued together
 * followed by the ones with the commands issued in lifecycle methods.
 */
const MAX_FLUSH_CYCLES = 4

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
  declare resolve?: (executed: boolean) => void
  declare reject?: (error: unknown) => void

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

/*
 * Queues the issued commands and executes the ones issued together
 * in a single update, once the current task has completed.
 */
class Dispatcher {
  declare mode: symbol
  declare queue: Command[]
  declare isFlushing: boolean
  declare root: WebComponent
  declare api: CommandsAPI
  declare commands: Commands & Record<string, AnyFunction>
  declare names: string[]

  ignoreIncoming() {
    this.mode = Mode.IGNORE
  }

  constructor(root: WebComponent) {
    this.mode = Mode.EXECUTE
    this.queue = []
    this.isFlushing = false
    this.root = root
    this.commands = {} as Commands & Record<string, AnyFunction>

    const customAPIs: CommandsAPI[] = []
    const ComponentClass = root.constructor as typeof WebComponent
    if (typeof ComponentClass.getCommands === 'function') {
      const customAPI = ComponentClass.getCommands()
      if (!customAPI) {
        throw new Error('No API returned in getCommands() method')
      }
      customAPIs.push(...(Array.isArray(customAPI) ? customAPI : [customAPI]))
    }
    this.api = createCommandsAPI(...customAPIs)
    this.names = Object.keys(this.api)

    for (const name of this.names) {
      this.commands[name] = (...args: unknown[]) => this.issue(name, args)
    }
  }

  createCommand(name: string, args: unknown[]) {
    return new Command(name, args, this.api[name]!)
  }

  issue(name: string, args: unknown[]): Promise<boolean> {
    if (this.mode === Mode.IGNORE) {
      return Promise.resolve(false)
    }
    const command = this.createCommand(name, args)
    const done = new Promise<boolean>((resolve, reject) => {
      command.resolve = resolve
      command.reject = reject
    })
    this.queue.push(command)
    // the commands issued while flushing are executed in the next cycle
    if (this.queue.length === 1 && !this.isFlushing) {
      queueMicrotask(() => this.flush())
    }
    return done
  }

  /**
   * Sets the state right away, when the root is rendered or receives
   * new props from its parent.
   */
  setState(state: State) {
    if (this.mode === Mode.IGNORE) {
      return
    }
    this.execute([this.createCommand('setState', [state])])
  }

  /**
   * Updates the root with the state calculated by the commands in turn.
   */
  execute(commands: Command[]) {
    const prevState = this.root.state as State | undefined
    const nextState = commands.reduce<State | undefined>(
      (state, command) => command.invoke(state),
      prevState,
    )!
    Renderer.update(this.root, prevState, nextState, commands)
  }

  /**
   * Executes the queued commands, followed by the ones issued in lifecycle
   * methods in turn, until there are none left. When an update fails,
   * its commands reject and the ones not executed resolve with false.
   */
  flush() {
    this.isFlushing = true
    let commands: Command[] = []
    try {
      for (let cycle = 1; this.queue.length; cycle++) {
        commands = this.queue.splice(0)
        // the root can be destroyed before the queued commands are executed
        if (this.mode === Mode.IGNORE) {
          commands.forEach(command => command.resolve!(false))
          continue
        }
        if (cycle > MAX_FLUSH_CYCLES) {
          throw new Error(
            'Too many cycles updating state in lifecycle methods!',
          )
        }
        this.execute(commands)
        commands.forEach(command => command.resolve!(true))
      }
    } catch (error) {
      commands.forEach(command => command.reject!(error))
      this.queue.splice(0).forEach(command => command.resolve!(false))
    } finally {
      this.isFlushing = false
    }
  }
}

export default Dispatcher
