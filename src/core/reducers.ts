export type State = Record<string, unknown>

export interface ReducerCommand {
  type: symbol
  [key: string]: unknown
}

/* Creates a command handled by a reducer. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- commands take any arguments
export type CommandCreator = (...args: any[]) => ReducerCommand

/* A reducer with the command creators it handles. */
export type Reducer = ((state: State, command: ReducerCommand) => State) & {
  commands: Record<string, CommandCreator>
}

const SET_STATE = Symbol('set-state')
const UPDATE = Symbol('update')

const coreReducer: Reducer = (state, command) => {
  if (command.type === SET_STATE) {
    return command.state as State
  }
  if (command.type === UPDATE) {
    return {
      ...state,
      ...(command.state as State),
    }
  }
  return state
}

coreReducer.commands = {
  setState: (state: State) => ({
    type: SET_STATE,
    state,
  }),
  update: (state: State) => ({
    type: UPDATE,
    state,
  }),
}

class Reducers {
  static combine(...reducers: Reducer[]): Reducer {
    const commands: Record<string, CommandCreator> = {}
    const reducer: Reducer = (state, command) => {
      for (const reducer of [coreReducer, ...reducers]) {
        state = reducer(state, command)
      }
      return state
    }
    for (const reducer of [coreReducer, ...reducers]) {
      const defined = Object.keys(commands)
      const incoming = Object.keys(reducer.commands)

      const overridden = incoming.find(key => defined.includes(key))
      if (overridden) {
        console.error(
          'Reducer:',
          reducer,
          `conflicts with an existing one with method: "${overridden}"`,
        )
        throw new Error(`The "${overridden}" command is already defined!`)
      }
      Object.assign(commands, reducer.commands)
    }
    reducer.commands = commands
    return reducer
  }
}

export default Reducers
