import { toolkit } from './toolkit.js'

class Service {
  static validate(listeners) {
    if (toolkit.isDebug()) {
      const keys = Object.keys(listeners)
      toolkit.assert(
        this.events instanceof Array,
        `Service "${this.name}" does not provide information about valid events, implement "static events = ['foo', 'bar']"`,
      )
      toolkit.assert(
        this.events.length > 0,
        `Service "${this.name}" returned an empty list of valid events, the "static events" list must contain at least one event name`,
      )
      const unsupportedKeys = Object.keys(listeners).filter(
        key => !this.events.includes(key),
      )
      for (const unsupportedKey of unsupportedKeys) {
        toolkit.warn(
          `Unsupported listener specified "${unsupportedKey}" when connecting to ${this.name}`,
        )
      }
      const supportedKeys = this.events.filter(event => keys.includes(event))
      toolkit.assert(
        supportedKeys.length > 0,
        `No valid listener specified when connecting to ${this.name}, use one of [${this.events.join(', ')}]`,
      )
      for (const supportedKey of supportedKeys) {
        toolkit.assert(
          listeners[supportedKey] instanceof Function,
          `Specified listener "${supportedKey}" for ${this.name} is not a function`,
        )
      }
    }
    return this.events.filter(event => listeners[event] instanceof Function)
  }
}

export default Service
