import { produce } from './draft.js'
import type { WebComponent } from './nodes.js'
import { runtime } from './runtime.js'
import type { AnyFunction } from './utils.js'

/* The state of a root component. */
export type State = Record<string, unknown>

/* A state transformation, calculating the next state. */
export type StateUpdate<S = State> = (state: S) => S

/*
 * A command changing a draft of the state, available as `this`,
 * which becomes the next immutable state.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- commands take any arguments
export type CommandMethod<S> = (this: S, ...args: any[]) => void

/* A map of command names to their methods. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- commands of any state by default
export type CommandsAPI<S = any> = Record<string, CommandMethod<S>>

/* The core commands available on every component. */
export type Commands<S = State> = {
  update(overrides: Partial<S>): Promise<boolean>
  replace(state: S): Promise<boolean>
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

/* The core commands, also setting the initial state, with no draft yet. */
const coreAPI: Record<keyof Commands, (arg: State) => StateUpdate> = {
  update(overrides) {
    return state => ({
      ...state,
      ...overrides,
    })
  },
  replace(state) {
    return () => state
  },
}

class Command {
  declare name: string
  declare args: unknown[]
  declare update: StateUpdate
  declare resolve?: (executed: boolean) => void
  declare reject?: (error: unknown) => void

  constructor(name: string, args: unknown[], update: StateUpdate) {
    this.name = name
    this.args = args
    this.update = update
  }

  invoke(state: State | undefined): State {
    return this.update(state as State)
  }
}

const createCommandsAPI = (...apis: CommandsAPI[]) => {
  const commandsAPI: CommandsAPI = {}
  for (const api of apis) {
    const overridden = Object.keys(api).find(
      key => Object.hasOwn(coreAPI, key) || Object.hasOwn(commandsAPI, key),
    )
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

    const { commands = [] } = root.constructor as typeof WebComponent
    this.api = createCommandsAPI(
      ...(Array.isArray(commands) ? commands : [commands]),
    )
    this.names = [...Object.keys(coreAPI), ...Object.keys(this.api)]

    for (const name of this.names) {
      this.commands[name] = (...args: unknown[]) => this.issue(name, args)
    }
  }

  createCommand(name: string, args: unknown[]) {
    const method = this.api[name]
    const update: StateUpdate = method
      ? state =>
          produce(state, draft => {
            const result: unknown = method.apply(draft, args)
            // the draft is revoked before the rest of an async command runs
            if (result instanceof Promise) {
              result.catch(() => {})
              throw new Error(`The "${name}" command must be synchronous!`)
            }
          })
      : coreAPI[name as keyof Commands](...(args as [State]))
    return new Command(name, args, update)
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
    this.execute([this.createCommand('replace', [state])])
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
    runtime().update(this.root, prevState, nextState, commands)
  }

  /**
   * Executes the queued commands, followed by the ones issued in lifecycle
   * methods in turn, until there are none left. When an update fails, its
   * commands reject, and the ones issued in its lifecycle methods are still
   * executed, as the update is completed.
   */
  flush() {
    this.isFlushing = true
    try {
      for (let cycle = 1; this.queue.length; cycle++) {
        const commands = this.queue.splice(0)
        // the root can be destroyed before the queued commands are executed
        if (this.mode === Mode.IGNORE) {
          commands.forEach(command => command.resolve!(false))
          continue
        }
        try {
          if (cycle > MAX_FLUSH_CYCLES) {
            throw new Error(
              'Too many cycles updating state in lifecycle methods!',
            )
          }
          this.execute(commands)
        } catch (error) {
          commands.forEach(command => command.reject!(error))
          continue
        }
        commands.forEach(command => command.resolve!(true))
      }
    } finally {
      this.isFlushing = false
    }
  }
}

export default Dispatcher
