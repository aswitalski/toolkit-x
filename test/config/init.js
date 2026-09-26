import 'dom-test'
import assert from 'assert'
import sinon from 'sinon'

global.assert = assert
global.sinon = sinon

{
  const registry = new Map()

  global.loader = {
    get(key) {
      return registry.get(key)
    },
    define(key, module) {
      registry.set(key, module)
    },
    async preload(key) {},
  }
}

const { default: toolkit } = await import('../../src/index.js')

toolkit.assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

global.opr = {
  Toolkit: toolkit,
}

toolkit.configure({
  debug: true,
})

global.CustomEvent = class {
  constructor(type, options) {
    this.type = type
    this.detail = options.detail
  }
}

global.suppressConsoleErrors = () => {
  let consoleError
  beforeEach(() => {
    consoleError = console.error
    console.error = () => {}
  })

  afterEach(() => {
    console.error = consoleError
  })
}

await import('./global.js')
