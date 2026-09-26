import type { PureComponent, RenderResult } from './bragi.js'
import type { ComponentDescription, Props } from './description.js'
import { Component, type ComponentClass, WebComponent } from './nodes.js'
import Plugins, { type PluginManifest } from './plugins.js'
import Template, { type ItemType } from './template.js'
import VirtualDOM from './virtual-dom.js'

const INIT = Symbol('init')

export interface Settings {
  debug: boolean
}

export interface Options {
  debug?: boolean
  plugins?: PluginManifest[]
}

/* Returns the module loader required to resolve modules by id. */
const getLoader = () => {
  if (typeof loader === 'undefined') {
    throw new Error('Resolving modules by id requires lazy-module-loader')
  }
  return loader
}

/* Function to Component mapping. */
const pureComponentClassRegistry = new Map<PureComponent, ComponentClass>()

class Toolkit {
  declare roots: Set<WebComponent>
  declare settings: Settings | null
  declare plugins: Plugins | null
  declare ready: Promise<boolean>
  declare assert: (condition: unknown, message?: string) => void;
  declare [INIT]: (value: boolean) => void

  constructor() {
    this.roots = new Set()
    this.settings = null
    this.ready = new Promise(resolve => {
      this[INIT] = resolve
    })
    this.assert = console.assert as Toolkit['assert']
  }

  /**
   * Configures Toolkit with given options object.
   */
  async configure(options: Options) {
    const settings = {} as Settings
    settings.debug = options.debug || false
    Object.freeze(settings)
    this.settings = settings
    this.plugins = this.createPlugins(options.plugins)
    this[INIT](true)
  }

  /**
   * Loads the script with the specified module id as an ES module.
   */
  import(path: string): Promise<void> {
    const modulePath = getLoader().path(path)
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = modulePath
      script.type = 'module'
      script.onload = () => {
        resolve()
      }
      script.onerror = error => {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- rejects with the load error event
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
    void this.plugins?.destroy()
    this.plugins = null
    this.roots.clear()
    this.settings = null
    pureComponentClassRegistry.clear()
    this.ready = new Promise(resolve => {
      this[INIT] = resolve
    })
  }

  createPlugins(manifests: PluginManifest[] = []): Plugins {
    const plugins = new Plugins(null)
    for (const manifest of manifests) {
      plugins.register(manifest)
    }
    return plugins
  }

  /**
   * Returns resolved Component class.
   */
  resolveComponentClass(component: unknown, type: ItemType): ComponentClass {
    switch (type) {
      case 'component':
        return component as ComponentClass
      case 'function':
        return this.resolvePureComponentClass(component as PureComponent)
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
  resolvePureComponentClass(fn: PureComponent): ComponentClass {
    let ComponentClass = pureComponentClassRegistry.get(fn)
    if (ComponentClass) {
      return ComponentClass
    }
    ComponentClass = class PureComponent extends Component {
      static renderer = fn

      render(): RenderResult {
        // the props type of a pure component is not known here
        return fn.call(this, this.props as never)
      }
    }
    pureComponentClassRegistry.set(fn, ComponentClass)
    return ComponentClass
  }

  /**
   * Returns a component class resolved by module loader
   * with the specified id.
   */
  resolveLoadedClass(id: string): ComponentClass {
    const ComponentClass = getLoader().get(id) as ComponentClass | undefined
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

  track(root: WebComponent) {
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

  get tracked(): WebComponent[] {
    const tracked: WebComponent[] = []
    for (const root of this.roots) {
      tracked.push(root, ...root.tracked)
    }
    return tracked
  }

  isDebug(): boolean {
    return Boolean(this.settings && this.settings.debug)
  }

  warn(...messages: unknown[]) {
    if (this.isDebug()) {
      console.warn(...messages)
    }
  }

  async createRoot(
    component: ComponentClass | string,
    props: Props = {},
  ): Promise<WebComponent> {
    if (typeof component === 'string') {
      const RootClass = (await getLoader().preload(component)) as ComponentClass
      const description = Template.describe([
        RootClass,
        props,
      ]) as ComponentDescription
      if (RootClass.prototype instanceof WebComponent) {
        return VirtualDOM.createWebComponent(description, null)
      }
      console.error('Specified class is not a WebComponent: ', RootClass)
      throw new Error('Invalid Web Component class!')
    }
    const description = Template.describe([
      component,
      props,
    ]) as ComponentDescription
    return VirtualDOM.createWebComponent(description, null)
  }

  async render(
    component: ComponentClass | string,
    container: Element,
    props: Props = {},
  ): Promise<WebComponent> {
    await this.ready
    const root = await this.createRoot(component, props)
    return root.mount(container)
  }
}

/* The Toolkit singleton, exposed globally as opr.Toolkit. */
export const toolkit = new Toolkit()

export default Toolkit
