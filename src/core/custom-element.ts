import DOM from './dom.js'
import Lifecycle from './lifecycle.js'
import type { WebComponent } from './nodes.js'
import Plugins, { type Plugin, type PluginManifest } from './plugins.js'

const cssImports = (paths: string[]) =>
  paths.map(path => `@import url(${path});`).join('\n')

type PluginOrManifest = Plugin | PluginManifest

export class ComponentElement extends HTMLElement {
  declare $root: WebComponent | null
  declare pendingDestruction?: ReturnType<typeof setTimeout>
  declare install: (plugin: PluginOrManifest, cascade?: boolean) => void
  declare uninstall: (
    plugin: PluginOrManifest | string,
    cascade?: boolean,
  ) => void

  constructor(root: WebComponent) {
    super()
    this.$root = root

    addPluginsAPI(this)

    root.shadow = this.attachShadow({
      mode: 'open',
    })

    const stylesheets = root.getStylesheets()

    const onSuccess = () => {
      root.init().catch((error: Error) => root.markAsFailed(error))
    }

    if (stylesheets && stylesheets.length) {
      const imports = cssImports(stylesheets)
      const onError = () => {
        // rejects mounting, as thrown errors do not leave the event handler
        root.markAsFailed(
          new Error(`Error loading stylesheets: ${stylesheets.join(', ')}`),
        )
      }
      const style = document.createElement('style')
      style.textContent = imports
      style.onload = onSuccess
      style.onerror = onError
      root.shadow.appendChild(style)
    } else {
      onSuccess()
    }
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
    Lifecycle.onComponentDestroyed(root)
    Lifecycle.onComponentDetached(root)
    root.ref = null
    this.$root = null
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
