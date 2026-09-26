import type { WebComponent } from './nodes.js'
import type { Update } from './renderer.js'
import Sandbox from './sandbox.js'
import { toolkit } from './toolkit.js'

const Permission = {
  LISTEN_FOR_UPDATES: 'listen-for-updates',
  REGISTER_METHOD: 'register-method',
  INJECT_STYLESHEETS: 'inject-stylesheets',
}

/* The API a plugin receives in its register() method. */
export interface PluginSandbox {
  registerMethod?(name: string): void
}

export interface PluginManifest {
  name: string
  permissions?: string[]
  register?(sandbox: PluginSandbox): void
  install?(root: WebComponent): () => void
  onBeforeUpdate?(update: Update): void
  onAfterUpdate?(update: Update): void
  getStylesheets?(): string[]
  [key: string]: unknown
}

class Plugin {
  declare name: string
  declare permissions: string[]
  declare origin: PluginManifest
  declare register?: () => void
  declare install?: (root: WebComponent) => () => void
  declare onBeforeUpdate?: (update: Update) => void
  declare onAfterUpdate?: (update: Update) => void
  declare getStylesheets?: () => string[]

  constructor(manifest: PluginManifest) {
    toolkit.assert(
      typeof manifest.name === 'string' && manifest.name.length,
      'Plugin name must be a non-empty string!',
    )

    Object.assign(this, manifest)
    this.origin = manifest

    if (this.permissions === undefined) {
      this.permissions = []
    } else {
      toolkit.assert(
        Array.isArray(this.permissions),
        'Plugin permissions must be an array',
      )
      this.permissions = this.permissions.filter(permission =>
        Object.values(Permission).includes(permission),
      )
    }

    const sandbox = this.createSandbox()
    if (typeof manifest.register === 'function') {
      this.register = () => manifest.register!(sandbox)
    }
    if (typeof manifest.install === 'function') {
      this.install = root => {
        const uninstall = manifest.install!(root)
        toolkit.assert(
          typeof uninstall === 'function',
          'The plugin installation must return the uninstall function!',
        )
        return uninstall
      }
    }
  }

  isListener(): boolean {
    return this.permissions.includes(Permission.LISTEN_FOR_UPDATES)
  }

  isStylesheetProvider(): boolean {
    return this.permissions.includes(Permission.INJECT_STYLESHEETS)
  }

  createSandbox(): PluginSandbox {
    const sandbox: PluginSandbox = {}
    for (const permission of this.permissions) {
      switch (permission) {
        case Permission.REGISTER_METHOD:
          sandbox.registerMethod = name => Sandbox.registerPluginMethod(name)
      }
    }
    return sandbox
  }
}

class Registry {
  declare plugins: Map<string, Plugin>
  declare cache: { listeners: Plugin[] };
  declare [Symbol.iterator]: () => Iterator<Plugin>

  constructor() {
    this.plugins = new Map()
    this.cache = {
      listeners: [],
    }
    this[Symbol.iterator] = () => this.plugins.values()[Symbol.iterator]()
  }

  /**
   * Adds the plugin to the registry
   */
  add(plugin: Plugin) {
    toolkit.assert(
      !this.isRegistered(plugin.name),
      `Plugin '${plugin.name}' is already registered!`,
    )
    this.plugins.set(plugin.name, plugin)
    this.updateCache()
  }

  /**
   * Checks if plugin with specified name exists in the registry.
   */
  isRegistered(name: string): boolean {
    return this.plugins.has(name)
  }

  /**
   * Updates the cache.
   */
  updateCache() {
    const plugins = [...this.plugins.values()]
    this.cache.listeners = plugins.filter(plugin => plugin.isListener())
  }
}

class Plugins {
  static Plugin = Plugin

  declare root: WebComponent | null
  declare registry: Registry
  declare uninstalls: Map<string, () => void>;
  declare [Symbol.iterator]: () => Iterator<Plugin>

  constructor(root: WebComponent | null) {
    this.root = root
    this.registry = new Registry()
    this.uninstalls = new Map()
    this[Symbol.iterator] = () => this.registry[Symbol.iterator]()
  }

  /**
   * Creates a Plugin instance from the manifest object and registers it.
   */
  register(plugin: Plugin | PluginManifest) {
    if (!(plugin instanceof Plugin)) {
      plugin = new Plugin(plugin)
    }
    if (plugin.register) {
      plugin.register()
    }
    this.registry.add(plugin)
  }

  installAll() {
    for (const plugin of this.registry) {
      this.install(plugin)
    }
  }

  install(plugin: Plugin | PluginManifest) {
    if (this.root && plugin.install) {
      const uninstall = plugin.install(this.root)
      this.uninstalls.set(plugin.name, uninstall)
    }
  }

  /**
   * Removes the plugin from the registry and invokes it's uninstall method
   * if present.
   */
  uninstall(name: string) {
    const uninstall = this.uninstalls.get(name)
    if (uninstall) {
      uninstall()
    }
  }

  /**
   * Uninstalls all the plugins from the registry.
   */
  async destroy() {
    for (const plugin of this.registry) {
      this.uninstall(plugin.name)
    }
    this.root = null
  }

  /**
   * Invokes listener methods on registered listener plugins.
   */
  notify(action: 'before-update' | 'after-update', event: Update) {
    switch (action) {
      case 'before-update':
        for (const listener of this.registry.cache.listeners) {
          listener.onBeforeUpdate!(event)
        }
        return
      case 'after-update':
        for (const listener of this.registry.cache.listeners) {
          listener.onAfterUpdate!(event)
        }
        return
      default:
        throw new Error(`Unknown action: ${action as string}`)
    }
  }
}

export type { Plugin }

export default Plugins
