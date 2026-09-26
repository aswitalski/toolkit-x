const SET_STATE = Symbol('set-state')
const UPDATE = Symbol('update')

const coreReducer = (state, command) => {
  if (command.type === SET_STATE) {
    return command.state
  }
  if (command.type === UPDATE) {
    return {
      ...state,
      ...command.state,
    }
  }
  return state
}

coreReducer.commands = {
  setState: state => ({
    type: SET_STATE,
    state,
  }),
  update: state => ({
    type: UPDATE,
    state,
  }),
}

class Reducers {
  static combine(...reducers) {
    const commands = {}
    const reducer = (state, command) => {
      for (const reducer of [coreReducer, ...reducers]) {
        state = reducer(state, command)
      }
      return state
    }
    for (const reducer of [coreReducer, ...reducers]) {
      const defined = Object.keys(commands)
      const incoming = Object.keys(reducer.commands)

      const overriden = incoming.find(key => defined.includes(key))
      if (overriden) {
        console.error(
          'Reducer:',
          reducer,
          `conflicts an with exiting one with method: "${overriden}"`,
        )
        throw new Error(`The "${overriden}" command is already defined!`)
      }
      Object.assign(commands, reducer.commands)
    }
    reducer.commands = commands
    return reducer
  }
}

export default Reducers
