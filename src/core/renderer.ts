import {
  CommentDescription,
  type ElementDescription,
  type NodeDescription,
  type Props,
} from './description.js'
import Diff from './diff.js'
import type { Command } from './dispatcher.js'
import Lifecycle from './lifecycle.js'
import type { Component, WebComponent } from './nodes.js'
import type Patch from './patch.js'
import Plugins, { type Plugin, type PluginManifest } from './plugins.js'
import type { State } from './reducers.js'
import Template from './template.js'
import utils from './utils.js'

/* Information about a root component update, passed to plugin listeners. */
export interface Update {
  command: Command
  root: WebComponent
  state: {
    from: State | undefined
    to: State
  }
  patches?: Patch[]
}

const Renderer = {
  /**
   * Calls the component render method and transforms the returned template
   * into the normalised description of the rendered node.
   */
  render(
    component: Component,
    props: Props = {},
    children: unknown[] = [],
  ): NodeDescription | null {
    component.sandbox.props = props
    component.sandbox.children = children
    const template = component.render.call(component.sandbox)
    if (template) {
      return Template.describe(template)
    }
    const text = (component.constructor as typeof Component).displayName
    return new CommentDescription(text)
  },

  /**
   * Updates the Web component and patches the DOM tree
   * to match the new component state.
   */
  update(
    root: WebComponent,
    from: State | undefined,
    to: State,
    command: Command,
  ) {
    const update: Update = {
      command,
      root,
      state: {
        from,
        to,
      },
    }

    this.onBeforeUpdate(update, root)

    const diff = new Diff(root, from, to)
    update.patches = diff.apply()

    this.onAfterUpdate(update, root)
  },

  /**
   * Notifies the observers about upcoming update.
   */
  onBeforeUpdate(update: Update, root: WebComponent) {
    root.plugins!.notify('before-update', update)
  },

  /**
   * Notifies the observers about completed update.
   */
  onAfterUpdate(update: Update, root: WebComponent) {
    root.plugins!.notify('after-update', update)
  },

  /**
   * Creates a new Custom Element instance assigned to specifed Web Component.
   */
  createCustomElement(root: WebComponent): ComponentElement {
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
    if (root.description.attrs) {
      const attrs = Object.entries(root.description.attrs)
      for (const [name, value] of attrs) {
        element.setAttribute(name, value)
      }
    }
    return element
  },

  /**
   * Creates a new DOM Element based on the specified description.
   */
  createElement(description: ElementDescription): HTMLElement {
    const element = document.createElement(description.name)
    if (description.text) {
      element.textContent = description.text
    }
    if (description.class) {
      element.className = description.class
    }
    if (description.style) {
      for (const [prop, value] of Object.entries(description.style)) {
        if (prop.startsWith('--')) {
          element.style.setProperty(prop, ` ${value}`)
        } else {
          ;(element.style as unknown as Record<string, string>)[prop] = value
        }
      }
    }
    if (description.listeners) {
      for (const [name, listener] of Object.entries(description.listeners)) {
        const event = utils.getEventName(name)
        element.addEventListener(event, listener)
      }
    }
    if (description.attrs) {
      for (const [attr, value] of Object.entries(description.attrs)) {
        const name = utils.getAttributeName(attr)
        element.setAttribute(name, value)
      }
    }
    if (description.dataset) {
      for (const [attr, value] of Object.entries(description.dataset)) {
        element.dataset[attr] = value
      }
    }
    if (description.properties) {
      for (const [prop, value] of Object.entries(description.properties)) {
        ;(element as unknown as Record<string, unknown>)[prop] = value
      }
    }
    if (description.custom) {
      if (description.custom.attrs) {
        const customAttributes = Object.entries(description.custom.attrs)
        for (const [name, value] of customAttributes) {
          element.setAttribute(name, value)
        }
      }
      if (description.custom.listeners) {
        const customListeners = Object.entries(description.custom.listeners)
        for (const [event, listener] of customListeners) {
          element.addEventListener(event, listener)
        }
      }
    }
    return element
  },
}

const cssImports = (paths: string[]) =>
  paths.map(path => `@import url(${path});`).join('\n')

type PluginOrManifest = Plugin | PluginManifest

class ComponentElement extends HTMLElement {
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
      void root.init()
    }

    if (stylesheets && stylesheets.length) {
      const imports = cssImports(stylesheets)
      const onError = () => {
        throw new Error(`Error loading stylesheets: ${stylesheets.join(', ')}`)
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
    const root = this.$root!
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

export default Renderer
