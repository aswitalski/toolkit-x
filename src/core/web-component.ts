import ChildNodes from './child-nodes.js'
import Comment from './comment.js'
import Component from './component.js'
import CreatedRoots from './created-roots.js'
import { createComponentElement } from './custom-element.js'
import { CommentDescription, type ComponentDescription } from './description.js'
import Dispatcher, {
  type BoundCommands,
  type Commands,
  type CommandsAPI,
  type State,
} from './dispatcher.js'
import Plugins from './plugins.js'
import { runtime } from './runtime.js'
import Template from './template.js'
import type VirtualNode from './virtual-node.js'
import type { NodeRef } from './virtual-node.js'

const CONTAINER = Symbol('container')
const CUSTOM_ELEMENT = Symbol('custom-element')
const DISPATCHER = Symbol('dispatcher')

/*
 * A root component with its own state, commands and plugins, rendered
 * in a custom element when elementName is defined.
 *
 * P: props received from the parent,
 * S: state, available as `this.props` when rendering,
 * C: commands API set as the static commands, changing the state.
 */
class WebComponent<
  P extends object = object,
  S extends object = P,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- no commands besides the core ones
  C extends CommandsAPI<S> = {},
> extends Component<S> {
  static NodeType = 'root'

  static styles: string[] = []

  /*
   * The child nodes rendered in the light DOM of the custom element,
   * separate from the `children` templates available when rendering.
   */
  declare childNodes?: VirtualNode[]
  declare subroots: Set<WebComponent>
  declare ready: Promise<void>
  declare markAsReady: () => void
  declare markAsFailed: (error: Error) => void
  declare plugins: Plugins | null
  declare shadow: ShadowRoot | null
  declare state?: S
  declare pendingDescription?: ComponentDescription
  declare stopTracking?: () => void
  declare elementClass?: CustomElementConstructor;
  declare [CONTAINER]?: Element;
  declare [CUSTOM_ELEMENT]?: HTMLElement | null;
  declare [DISPATCHER]: Dispatcher

  constructor(
    description: ComponentDescription,
    parent: VirtualNode | null = null,
    context: WebComponent | null = null,
  ) {
    super(description, parent, context, /*= attachDOM */ false)
    // before being tracked, to be destroyed when rendering it fails
    CreatedRoots.collectRoot(this)
    this.subroots = new Set()
    this.dispatcher = new Dispatcher(this)
    this.ready = new Promise((resolve, reject) => {
      this.markAsReady = resolve
      this.markAsFailed = reject
    })
    this.plugins = this.createPlugins()
    // from the start, for the plugins to be replaced when reconfigured
    runtime().track(this)
    this.content = this.createPlaceholder()
    this.shadow = null
    this.attachDOM()
  }

  attachDOM() {
    if ((this.constructor as typeof WebComponent).elementName) {
      this.ref = createComponentElement(this)
      this.plugins!.installAll()
    } else {
      this.plugins!.installAll()
      super.attachDOM()
    }
  }

  createPlaceholder(): VirtualNode {
    return new Comment(
      new CommentDescription(
        (this.constructor as typeof WebComponent).displayName,
      ),
    )
  }

  /**
   * Triggers the initial rendering of the component in given container.
   */
  async init() {
    // props are passed from templates, which are not checked against P
    const state = await this.getInitialState.call(
      this.sandbox,
      (this.description.props || {}) as P,
    )
    this.setState(state)

    if (this.pendingDescription) {
      const description = this.pendingDescription
      delete this.pendingDescription
      setTimeout(() => this.update(description))
    }
    this.isInitialized = true
    this.markAsReady()
  }

  setState(state: S) {
    if (state.constructor !== Object) {
      throw new Error('Web Component state must be a plain object!')
    }
    this.dispatcher.setState(
      Template.normalizeComponentProps(
        state as State,
        this.constructor as typeof WebComponent,
      ),
    )
  }

  /**
   * Triggers the component update.
   */
  update(description: ComponentDescription) {
    if (!this.isInitialized) {
      this.pendingDescription = description
      return
    }
    const state = this.getUpdatedState(
      (description.props || {}) as P,
      this.state || ({} as S),
    )
    this.setState(state)
  }

  /**
   * The default implementation delegating the calculation of initial state
   * to the state manager.
   */
  getInitialState(props: P): S | Promise<S> {
    // the default state is a copy of the props
    return { ...props } as unknown as S
  }

  /**
   * The default implementation delegating the calculation of updated state
   * to the state manager.
   */
  getUpdatedState(props: P, state: S): S {
    return {
      ...state,
      ...props,
    }
  }

  get dispatcher(): Dispatcher {
    return this[DISPATCHER]
  }

  set dispatcher(dispatcher: Dispatcher) {
    this[DISPATCHER] = dispatcher
  }

  get commands(): Commands<S> & BoundCommands<C> {
    return this.dispatcher.commands as Commands<S> & BoundCommands<C>
  }

  createPlugins(): Plugins {
    const plugins = new Plugins(this)
    const inherited = this.parentNode
      ? (this.parentNode as WebComponent).plugins
      : runtime().plugins
    for (const plugin of inherited!) {
      plugins.register(plugin)
    }
    return plugins
  }

  async mount(container: Element): Promise<this> {
    if ((this.constructor as typeof WebComponent).elementName) {
      // triggers this.init() from element's connected callback
      container.appendChild(this.ref)
      await this.ready
    } else {
      this.container = container
      await this.init()
    }
    return this
  }

  getStylesheets(): string[] {
    const stylesheets: string[] = []
    const stylesheetProviders = [...this.plugins!].filter(plugin =>
      plugin.isStylesheetProvider(),
    )
    for (const plugin of stylesheetProviders) {
      if (typeof plugin.getStylesheets !== 'function') {
        throw new Error(
          `Plugin '${plugin.name}' must provide the getStylesheets() method!`,
        )
      }
      stylesheets.push(...plugin.getStylesheets())
    }
    const RootClass = this.constructor as typeof WebComponent
    if (Array.isArray(RootClass.styles)) {
      stylesheets.push(...RootClass.styles)
    }
    return stylesheets
  }

  get ref(): NodeRef {
    return this[CUSTOM_ELEMENT] || super.ref
  }

  set ref(ref: HTMLElement | null) {
    this[CUSTOM_ELEMENT] = ref
  }

  set container(container: Element | undefined) {
    this[CONTAINER] = container
  }

  get container(): Element | undefined {
    return this[CONTAINER]
  }

  get tracked(): WebComponent[] {
    const tracked: WebComponent[] = []
    for (const root of this.subroots) {
      tracked.push(root, ...root.tracked)
    }
    return tracked
  }

  destroy() {
    if (!this.plugins) {
      // already destroyed
      return
    }
    super.destroy()
    // not tracked when destroyed before being initialized
    this.stopTracking?.()
    this.dispatcher.ignoreIncoming()
    this.plugins.destroy()
    this.plugins = null
    this.parentNode = null
  }

  setChildNodes(nodes: VirtualNode[]) {
    ChildNodes.set(this, nodes)
  }

  insertChild(child: VirtualNode, index?: number) {
    ChildNodes.insert(this, child, index)
  }

  replaceChild(child: VirtualNode, node: VirtualNode) {
    ChildNodes.replace(this, child, node)
  }

  moveChild(child: VirtualNode, from: number, to: number) {
    ChildNodes.move(this, child, from, to)
  }

  removeChild(child: VirtualNode) {
    ChildNodes.remove(this, child)
  }

  get nodeType(): string {
    return WebComponent.NodeType
  }
}

export default WebComponent
