import DOM from './dom.js'
import Lifecycle, { throwErrors } from './lifecycle.js'
import type { WebComponent } from './nodes.js'
import Plugins, { type Plugin, type PluginManifest } from './plugins.js'
import { isSameList } from './utils.js'

const cssImports = (paths: string[]) =>
  paths.map(path => `@import url(${path});`).join('\n')

type PluginOrManifest = Plugin | PluginManifest

export class ComponentElement extends HTMLElement {
  declare $root: WebComponent | null
  declare pendingDestruction?: ReturnType<typeof setTimeout>
  declare stylesheets: string[]
  declare styleElement: HTMLStyleElement | null
  declare stylesheetsLoaded: Promise<void>
  declare install: (plugin: PluginOrManifest, cascade?: boolean) => void
  declare uninstall: (
    plugin: PluginOrManifest | string,
    cascade?: boolean,
  ) => void

  constructor(root: WebComponent) {
    super()
    this.$root = root
    this.stylesheets = []
    this.styleElement = null
    this.stylesheetsLoaded = Promise.resolve()

    addPluginsAPI(this)

    root.shadow = this.attachShadow({
      mode: 'open',
    })

    const stylesheets = root.getStylesheets()

    const init = () => {
      root.init().catch((error: Error) => root.markAsFailed(error))
    }

    if (stylesheets.length) {
      // rejects mounting, as the errors are not thrown to the caller
      this.loadStylesheets(stylesheets).then(init, (error: Error) =>
        root.markAsFailed(error),
      )
    } else {
      init()
    }
  }

  /**
   * Replaces the stylesheets imported in the shadow root, keeping the
   * previous ones until the new ones are loaded.
   */
  loadStylesheets(stylesheets: string[]): Promise<void> {
    const previous = this.styleElement
    this.stylesheets = stylesheets
    let loaded = Promise.resolve()
    if (stylesheets.length) {
      const style = document.createElement('style')
      style.textContent = cssImports(stylesheets)
      loaded = new Promise((resolve, reject) => {
        style.onload = () => resolve()
        style.onerror = () =>
          reject(
            new Error(`Error loading stylesheets: ${stylesheets.join(', ')}`),
          )
      })
      if (previous) {
        previous.after(style)
      } else {
        this.shadowRoot!.prepend(style)
      }
      this.styleElement = style
    } else {
      this.styleElement = null
    }
    if (previous) {
      // removed once loaded, as the root may be waiting to be initialized
      void Promise.allSettled([this.stylesheetsLoaded, loaded]).then(() =>
        previous.remove(),
      )
    }
    this.stylesheetsLoaded = loaded
    return loaded
  }

  get isComponentElement() {
    return true
  }

  connectedCallback() {
    clearTimeout(this.pendingDestruction)
  }

  disconnectedCallback() {
    this.pendingDestruction = setTimeout(() => this.destroy(), 50)
  }

  destroy() {
    const root = this.$root
    if (!root) {
      // already destroyed, e.g. directly before the scheduled destruction
      return
    }
    // the hooks of all the components are called when some of them throw
    const errors: unknown[] = []
    Lifecycle.collectingErrors(errors, () => {
      Lifecycle.onComponentDestroyed(root)
      Lifecycle.onComponentDetached(root)
    })
    root.ref = null
    this.$root = null
    throwErrors(errors, 'Errors destroying the component')
  }
}

const addPluginsAPI = (element: ComponentElement) => {
  const { Plugin } = Plugins
  element.install = (plugin, cascade = true) => {
    const installTo = (root: WebComponent) => {
      if (plugin instanceof Plugin) {
        root.plugins!.registry.add(plugin)
        root.plugins!.install(plugin)
      } else {
        root.plugins!.install(plugin)
      }
      if (cascade) {
        for (const subroot of root.subroots) {
          installTo(subroot)
        }
      }
    }
    installTo(element.$root!)
  }
  element.uninstall = (plugin, cascade = true) => {
    const name = typeof plugin === 'string' ? plugin : plugin.name
    const uninstallFrom = (root: WebComponent) => {
      root.plugins!.uninstall(name)
      if (cascade) {
        for (const subroot of root.subroots) {
          uninstallFrom(subroot)
        }
      }
    }
    uninstallFrom(element.$root!)
  }
}

/**
 * Loads the stylesheets of the root in its custom element when they
 * changed, e.g. with the plugins reconfigured.
 */
export const updateStylesheets = (root: WebComponent) => {
  const element = root.ref as ComponentElement
  const stylesheets = root.getStylesheets()
  if (!isSameList(stylesheets, element.stylesheets)) {
    element
      .loadStylesheets(stylesheets)
      .catch((error: unknown) => console.error(error))
  }
}

/**
 * Creates a new Custom Element instance assigned to specified Web Component.
 */
export const createComponentElement = (
  root: WebComponent,
): ComponentElement => {
  const defineCustomElementClass = (RootClass: typeof WebComponent) => {
    let ElementClass = customElements.get(RootClass.elementName!) as
      typeof ComponentElement | undefined
    if (!ElementClass) {
      ElementClass = class RootElement extends ComponentElement {}
      customElements.define(RootClass.elementName!, ElementClass)
      RootClass.prototype.elementClass = ElementClass
    }
    return ElementClass
  }
  const ElementClass = defineCustomElementClass(
    root.constructor as typeof WebComponent,
  )
  const element = new ElementClass(root)
  // the attributes of a root are custom, as set by the diff
  for (const [name, value] of Object.entries(root.description.attrs ?? {})) {
    DOM.setAttribute(element, name, value, true)
  }
  return element
}
