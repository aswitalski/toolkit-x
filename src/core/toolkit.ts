import type { PureComponent, RenderResult } from './bragi.js'
import CreatedRoots from './created-roots.js'
import { updateStylesheets } from './custom-element.js'
import type { ComponentDescription, Props } from './description.js'
import { Component, type ComponentClass, WebComponent } from './nodes.js'
import Plugins, { type PluginManifest } from './plugins.js'
import Renderer from './renderer.js'
import { provideRuntime } from './runtime.js'
import Sandbox from './sandbox.js'
import Template, { type ItemType } from './template.js'
import { isSameList } from './utils.js'
import VirtualDOM from './virtual-dom.js'

export interface Settings {
  readonly debug: boolean
}

export interface Options {
  debug?: boolean
  plugins?: PluginManifest[]
}

/*
 * The state used by the core modules through the runtime, kept out of
 * the public Toolkit instance.
 */

/* The top-level root components, tracking their subroots. */
const roots = new Set<WebComponent>()

/* The settings used until Toolkit is configured. */
const defaultSettings: Settings = Object.freeze({ debug: false })

/* Function to Component mapping. */
const pureComponentClassRegistry = new Map<PureComponent, ComponentClass>()

const createPlugins = (manifests: PluginManifest[] = []): Plugins => {
  const plugins = new Plugins(null)
  for (const manifest of manifests) {
    plugins.register(manifest)
  }
  return plugins
}

/* The plugins configured for all root components. */
let plugins = createPlugins()

/**
 * Returns a PureComponent class rendering the template
 * provided by the specified function.
 */
const resolvePureComponentClass = (fn: PureComponent): ComponentClass => {
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
 * Returns resolved Component class.
 */
const resolveComponentClass = (
  component: unknown,
  type: ItemType,
): ComponentClass => {
  switch (type) {
    case 'component':
      return component as ComponentClass
    case 'function':
      return resolvePureComponentClass(component as PureComponent)
    default:
      throw new Error(`Unsupported component type: ${type}`)
  }
}

const track = (root: WebComponent) => {
  if (root.parentNode) {
    const parentRootNode = root.parentNode.rootNode
    parentRootNode.subroots.add(root)
    root.stopTracking = () => {
      parentRootNode.subroots.delete(root)
    }
  } else {
    roots.add(root)
    root.stopTracking = () => {
      roots.delete(root)
    }
  }
}

class Toolkit {
  declare settings: Settings
  declare assert: (condition: unknown, message?: string) => void

  constructor() {
    this.settings = defaultSettings
    this.assert = console.assert as Toolkit['assert']
  }

  /**
   * Configures Toolkit with given options, keeping the current values
   * of the options not provided, by default no debug mode and no plugins.
   * Changed plugins are uninstalled from the created roots, and the new
   * ones installed in their place, with their stylesheets loaded.
   */
  configure(options: Options) {
    if (options.debug !== undefined) {
      this.settings = Object.freeze({ debug: options.debug })
    }
    const manifests = options.plugins
    const previous = [...plugins]
    const origins = previous.map(plugin => plugin.origin)
    if (!manifests || isSameList(origins, manifests)) {
      return
    }
    // the methods of the remaining plugins are registered again below
    Sandbox.clearPluginMethods()
    plugins = createPlugins(manifests)
    for (const root of this.tracked) {
      for (const plugin of previous) {
        root.plugins!.uninstall(plugin.name)
      }
      for (const plugin of root.plugins!) {
        plugin.register?.()
      }
      for (const plugin of plugins) {
        root.plugins!.register(plugin)
        root.plugins!.install(plugin)
      }
      if (root.shadow) {
        updateStylesheets(root)
      }
    }
  }

  /**
   * Resets Toolkit to a pristine state, with the default settings
   * and no plugins, forgetting the created roots.
   */
  reset() {
    plugins.destroy()
    plugins = createPlugins()
    roots.clear()
    this.settings = defaultSettings
    pureComponentClassRegistry.clear()
    Sandbox.clearPluginMethods()
  }

  /* The created root components, with their subroots, until destroyed. */
  get tracked(): WebComponent[] {
    const tracked: WebComponent[] = []
    for (const root of roots) {
      tracked.push(root, ...root.tracked)
    }
    return tracked
  }

  isDebug(): boolean {
    return this.settings.debug
  }

  warn(...messages: unknown[]) {
    if (this.isDebug()) {
      console.warn(...messages)
    }
  }

  async createRoot(
    component: ComponentClass,
    props: Props = {},
  ): Promise<WebComponent> {
    const description = Template.describe([
      component,
      props,
    ]) as ComponentDescription
    // not to stay tracked, with the plugins installed, when it throws
    return CreatedRoots.destroyingRootsOnError(() =>
      VirtualDOM.createWebComponent(description, null),
    )
  }

  async render(
    component: ComponentClass,
    container: Element,
    props: Props = {},
  ): Promise<WebComponent> {
    const root = await this.createRoot(component, props)
    return root.mount(container)
  }
}

/* The Toolkit singleton, exposed globally as toolkit. */
export const toolkit = new Toolkit()

// asserts, debug mode and warnings are read from the instance, which
// can be configured, e.g. with the assert function throwing in tests
provideRuntime({
  get plugins() {
    return plugins
  },
  assert: (condition, message) => toolkit.assert(condition, message),
  isDebug: () => toolkit.isDebug(),
  warn: (...messages) => toolkit.warn(...messages),
  track,
  resolveComponentClass,
  update: (root, from, to, commands) =>
    Renderer.update(root, from, to, commands),
})

export default Toolkit
