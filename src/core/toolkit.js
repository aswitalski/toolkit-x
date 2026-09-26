import { Component, WebComponent } from './nodes.js'
import Plugins from './plugins.js'
import Template from './template.js'
import VirtualDOM from './virtual-dom.js'

const INIT = Symbol('init')

/* Function to Component mapping. */
const pureComponentClassRegistry = new Map()

class Toolkit {
  constructor() {
    this.roots = new Set()
    this.settings = null
    this.ready = new Promise(resolve => {
      this[INIT] = resolve
    })
    this.assert = console.assert
  }

  /**
   * Configures Toolkit with given options object.
   */
  async configure(options) {
    const settings = {}
    settings.debug = options.debug || false
    Object.freeze(settings)
    this.settings = settings
    this.plugins = this.createPlugins(options.plugins)
    this[INIT](true)
  }

  import(path) {
    const modulePath = loader.path(path)
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = modulePath
      script.type = 'module'
      script.onload = () => {
        resolve()
      }
      script.onerror = error => {
        reject(error)
      }
      document.head.appendChild(script)
    })
  }

  /**
   * Resets Toolkit to a pristine state. All future render requests
   * will require new configuration to be provided first.
   */
  reset() {
    this.plugins.destroy()
    this.plugins = null
    this.roots.clear()
    this.settings = null
    pureComponentClassRegistry.clear()
    this.ready = new Promise(resolve => {
      this[INIT] = resolve
    })
  }

  createPlugins(manifests = []) {
    const plugins = new Plugins(null)
    for (const manifest of manifests) {
      plugins.register(manifest)
    }
    return plugins
  }

  /**
   * Returns resolved Component class.
   */
  resolveComponentClass(component, type) {
    switch (type) {
      case 'component':
        return component
      case 'function':
        return this.resolvePureComponentClass(component)
      case 'symbol':
        return this.resolveLoadedClass(String(component).slice(7, -1))
      default:
        throw new Error(`Unsupported component type: ${type}`)
    }
  }

  /**
   * Returns a PureComponent class rendering the template
   * provided by the specified function.
   */
  resolvePureComponentClass(fn) {
    let ComponentClass = pureComponentClassRegistry.get(fn)
    if (ComponentClass) {
      return ComponentClass
    }
    ComponentClass = class PureComponent extends Component {
      render() {
        fn.bind(this)(this.props)
      }
    }
    ComponentClass.renderer = fn
    pureComponentClassRegistry.set(fn, ComponentClass)
    return ComponentClass
  }

  /**
   * Returns a component class resolved by module loader
   * with the specified id.
   */
  resolveLoadedClass(id) {
    const ComponentClass = loader.get(id)
    if (!ComponentClass) {
      throw new Error(`Error resolving component class for '${id}'`)
    }
    if (!(ComponentClass.prototype instanceof Component)) {
      console.error(
        'Module:',
        ComponentClass,
        'is not a component extending Component!',
      )
      throw new Error(
        `Module defined with id "${id}" is not a component class.`,
      )
    }
    return ComponentClass
  }

  track(root) {
    if (root.parentNode) {
      const parentRootNode = root.parentNode.rootNode
      parentRootNode.subroots.add(root)
      root.stopTracking = () => {
        parentRootNode.subroots.delete(root)
      }
    } else {
      this.roots.add(root)
      root.stopTracking = () => {
        this.roots.delete(root)
      }
    }
  }

  get tracked() {
    const tracked = []
    for (const root of this.roots) {
      tracked.push(root, ...root.tracked)
    }
    return tracked
  }

  isDebug() {
    return Boolean(this.settings && this.settings.debug)
  }

  warn(...messages) {
    if (this.isDebug()) {
      console.warn(...messages)
    }
  }

  async createRoot(component, props = {}) {
    if (typeof component === 'string') {
      const RootClass = await loader.preload(component)
      const description = Template.describe([RootClass, props])
      if (RootClass.prototype instanceof WebComponent) {
        return VirtualDOM.createWebComponent(description, null)
      }
      console.error('Specified class is not a WebComponent: ', ComponentClass)
      throw new Error('Invalid Web Component class!')
    }
    const description = Template.describe([component, props])
    return VirtualDOM.createWebComponent(description, null)
  }

  async render(component, container, props = {}) {
    await this.ready
    const root = await this.createRoot(component, props)
    return root.mount(container)
  }
}

/* The Toolkit singleton, exposed globally as opr.Toolkit. */
export const toolkit = new Toolkit()

export default Toolkit
