import type { Child, RenderResult } from './bragi.js'
import { createComponentElement } from './custom-element.js'
import {
  CommentDescription,
  type ComponentDescription,
  type ElementDescription,
  type NodeDescription,
  type Props,
  type TextDescription,
} from './description.js'
import Dispatcher, {
  type BoundCommands,
  type Commands,
  type CommandsAPI,
} from './dispatcher.js'
import DOM from './dom.js'
import Plugins from './plugins.js'
import type { Reducer, State } from './reducers.js'
import { runtime } from './runtime.js'
import Sandbox, { type ComponentSandbox } from './sandbox.js'
import Template from './template.js'
import { type AnyFunction, invariant } from './utils.js'
import VirtualDOM from './virtual-dom.js'

/* The DOM node rendered for a virtual node. */
export type NodeRef = Element | CharacterData

/*
 * A node with child nodes: an element, or a Web Component
 * with the child nodes rendered in its light DOM.
 */
export type ParentVirtualNode = VirtualElement | WebComponent

/* A task run when a component is destroyed, e.g. disconnecting a service. */
export type CleanUpTask = (() => void) & { service?: unknown }

/* A service components connect to, e.g. a subclass of Service. */
export interface Connectable {
  connect(listeners: Record<string, unknown>): () => void
}

/* The class of any component, whatever its props. */
export type ComponentClass = typeof Component<object>

/*
 * An abstract parent node.
 */
abstract class VirtualNode {
  declare description: NodeDescription
  declare key?: string
  declare parentNode: VirtualNode | null
  declare context: WebComponent | null

  abstract ref: NodeRef
  abstract get nodeType(): string
  abstract attachDOM(): void

  constructor(
    description: NodeDescription,
    parentNode: VirtualNode | null = null,
    context: WebComponent | null = null,
  ) {
    this.description = description
    this.key = description.key
    this.parentNode = parentNode
    this.context = context
  }

  get parentElement(): VirtualNode | null {
    if (this.parentNode) {
      return this.parentNode.isElement()
        ? this.parentNode
        : this.parentNode.parentElement
    }
    return null
  }

  get container(): Element | VirtualNode | undefined {
    if (this.parentNode) {
      return this.parentNode.container
    }
    return this
  }

  get rootNode(): WebComponent {
    if (this.isRoot()) {
      return this
    }
    if (this.parentNode) {
      return this.parentNode.rootNode
    }
    throw new Error('Inconsistent virtual DOM tree detected!')
  }

  isRoot(): this is WebComponent {
    return this instanceof WebComponent
  }

  isComponent(): this is Component {
    return this instanceof Component
  }

  isElement(): this is VirtualElement {
    return this instanceof VirtualElement
  }

  isComment(): this is Comment {
    return this instanceof Comment
  }

  isText(): this is Text {
    return this instanceof Text
  }

  isCompatible(node: VirtualNode | null | undefined) {
    return node && this.nodeType === node.nodeType && this.key === node.key
  }
}

/*
 * Node representing Component in the virtual DOM tree.
 * Components
 */
class Component<P extends object = object> extends VirtualNode {
  static NodeType = 'component'

  declare static elementName?: string
  declare static defaultProps?: Props

  static getCommands?(): CommandsAPI | CommandsAPI[]

  static get displayName(): string {
    return this.name
  }

  declare description: ComponentDescription
  declare sandbox: ComponentSandbox
  declare cleanUpTasks: CleanUpTask[]
  declare isInitialized: boolean
  declare content: VirtualNode | null

  /* The component props, available on the sandbox passed as `this`. */
  declare props: P

  /* The child templates, available on the sandbox passed as `this`. */
  declare children: Child[]

  onCreated?(): void
  onAttached?(): void
  onPropsReceived?(nextProps: P): void
  onUpdated?(prevProps: P): void
  onDestroyed?(): void
  onDetached?(): void

  constructor(
    description: ComponentDescription,
    parent?: VirtualNode | null,
    context?: WebComponent | null,
    attachDOM = true,
  ) {
    super(description, parent, context)
    this.sandbox = Sandbox.create(this)
    this.cleanUpTasks = []
    this.isInitialized = attachDOM
    if (attachDOM) {
      this.attachDOM()
    }
    // the rendered content is inserted right after instantiation
    this.content = null
  }

  /**
   * Sets the component content.
   */
  setContent(node: VirtualNode) {
    invariant(
      node.parentNode === this,
      'Specified node does not have a valid parent!',
    )
    this.content!.parentNode = null
    node.parentNode = this
    this.content!.ref.replaceWith(node.ref)
    this.content = node
  }

  hasOwnMethod(method: string): boolean {
    // eslint-disable-next-line no-prototype-builtins
    return (this.constructor as ComponentClass).prototype.hasOwnProperty(method)
  }

  connectTo(service: Connectable, listeners: Record<string, unknown>) {
    runtime().assert(
      typeof service.connect === 'function',
      'Services have to define the connect() method',
    )
    const disconnect: CleanUpTask = service.connect(listeners)
    runtime().assert(
      typeof disconnect === 'function',
      'The result of the connect() method has to be a disconnect() method',
    )
    disconnect.service = service
    this.cleanUpTasks.push(disconnect)
  }

  get childElement(): VirtualNode | null {
    if (this.content) {
      if (this.content.isElement() || this.content.isRoot()) {
        return this.content
      }
      if (this.content.isComponent()) {
        return this.content.childElement
      }
    }
    return null
  }

  get placeholder(): VirtualNode | null {
    if (this.content!.isComment()) {
      return this.content
    }
    return (this.content as Component).placeholder || null
  }

  render(): RenderResult {
    return undefined
  }

  /**
   * Calls the render method and transforms the returned template
   * into the normalised description of the rendered node.
   */
  renderDescription(
    props: Props = {},
    children: unknown[] = [],
  ): NodeDescription | null {
    this.sandbox.props = props
    this.sandbox.children = children
    const template = this.render.call(this.sandbox)
    if (template) {
      return Template.describe(template)
    }
    const text = (this.constructor as ComponentClass).displayName
    return new CommentDescription(text)
  }

  /* The commands of the root component, whose types are not known here. */
  get commands(): Commands<unknown> & Record<string, AnyFunction> {
    return this.context ? this.context.commands : this.rootNode.commands
  }

  get dispatcher(): Dispatcher {
    return this.context ? this.context.dispatcher : this.rootNode.dispatcher
  }

  destroy() {
    for (const cleanUpTask of this.cleanUpTasks) {
      cleanUpTask()
    }
  }

  get nodeType(): string {
    return Component.NodeType
  }

  get ref(): NodeRef {
    return this.content!.ref
  }

  isCompatible(node: VirtualNode | null | undefined) {
    return super.isCompatible(node) && this.constructor === node!.constructor
  }

  attachDOM() {
    if (this.content) {
      this.content.attachDOM()
    }
  }
}

const CONTAINER = Symbol('container')
const CUSTOM_ELEMENT = Symbol('custom-element')
const DISPATCHER = Symbol('dispatcher')

/*
 * A root component with its own state, commands and plugins, rendered
 * in a custom element when elementName is defined.
 *
 * P: props received from the parent,
 * S: state, available as `this.props` when rendering,
 * C: commands API returned by getCommands().
 */
class WebComponent<
  P extends object = object,
  S extends object = P,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- no commands besides the core ones
  C extends CommandsAPI = {},
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

  getReducers?(): Reducer[]

  constructor(
    description: ComponentDescription,
    parent: VirtualNode | null = null,
    context: WebComponent | null = null,
  ) {
    super(description, parent, context, /*= attachDOM */ false)
    // before being tracked, to be destroyed when rendering it fails
    VirtualDOM.collectRoot(this)
    this.subroots = new Set()
    this.dispatcher = new Dispatcher(this)
    this.ready = new Promise((resolve, reject) => {
      this.markAsReady = resolve
      this.markAsFailed = reject
    })
    this.plugins = this.createPlugins()
    this.content = this.createPlaceholder()
    this.shadow = null
    this.attachDOM()
  }

  attachDOM() {
    if ((this.constructor as typeof WebComponent).elementName) {
      this.ref = createComponentElement(this)
      this.plugins!.installAll()
      if (this.description.children) {
        ChildNodes.create(this)
        ChildNodes.attach(this)
      }
    } else {
      this.plugins!.installAll()
      super.attachDOM()
    }
  }

  createPlaceholder(): VirtualNode {
    return VirtualDOM.createFromDescription(
      new CommentDescription(
        (this.constructor as typeof WebComponent).displayName,
      ),
    )!
  }

  /**
   * Triggers the initial rendering of the component in given container.
   */
  async init() {
    runtime().track(this)

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
    this.commands.setState(
      Template.normalizeComponentProps(
        state as State,
        this.constructor as typeof WebComponent,
      ) as S,
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

class VirtualElement extends VirtualNode {
  static NodeType = 'element'

  declare description: ElementDescription
  declare ref: HTMLElement
  declare children?: VirtualNode[]

  constructor(
    description: ElementDescription,
    parent?: VirtualNode | null,
    context?: WebComponent | null,
  ) {
    super(description, parent, context)
    if (description.children) {
      ChildNodes.create(this)
    }
    this.attachDOM()
  }

  /* The child nodes, as shared with Web Components. */
  get childNodes(): VirtualNode[] | undefined {
    return this.children
  }

  set childNodes(nodes: VirtualNode[] | undefined) {
    if (nodes) {
      this.children = nodes
    } else {
      delete this.children
    }
  }

  get nodeType(): string {
    return VirtualElement.NodeType
  }

  isCompatible(node: VirtualNode | null | undefined) {
    return (
      super.isCompatible(node) &&
      this.description.name === (node as VirtualElement).description.name
    )
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

  attachDOM() {
    this.ref = DOM.createElement(this.description)
    ChildNodes.attach(this)
  }
}

class Comment extends VirtualNode {
  static NodeType = 'comment'

  declare description: CommentDescription
  declare ref: globalThis.Comment

  constructor(description: CommentDescription, parentNode?: VirtualNode) {
    super(description, parentNode)
    this.attachDOM()
  }

  get nodeType(): string {
    return Comment.NodeType
  }

  attachDOM() {
    this.ref = document.createComment(` ${this.description.text} `)
  }
}

class Text extends VirtualNode {
  static NodeType = 'text'

  declare description: TextDescription
  declare ref: globalThis.Text

  constructor(description: TextDescription, parentNode?: VirtualNode) {
    super(description, parentNode)
    this.attachDOM()
  }

  get nodeType(): string {
    return Text.NodeType
  }

  attachDOM() {
    this.ref = document.createTextNode(this.description.text)
  }
}

/*
 * Operations on the child nodes of the parent nodes, which store them
 * as `children` of an element or `childNodes` of a Web Component.
 */
const ChildNodes = {
  create(parent: ParentVirtualNode) {
    parent.childNodes = parent.description.children!.map(description =>
      VirtualDOM.createFromDescription(description, parent, parent.context)!,
    )
  },

  attach(parent: ParentVirtualNode) {
    for (const child of parent.childNodes ?? []) {
      parent.ref.appendChild(child.ref)
    }
  },

  insert(parent: ParentVirtualNode, child: VirtualNode, index?: number) {
    const nodes = parent.childNodes ?? []
    if (index === undefined) {
      index = nodes.length
    }
    const nextChild = nodes[index]
    nodes.splice(index, 0, child)
    parent.childNodes = nodes
    parent.ref.insertBefore(child.ref, (nextChild && nextChild.ref) || null)
    child.parentNode = parent
  },

  replace(parent: ParentVirtualNode, child: VirtualNode, node: VirtualNode) {
    const nodes = parent.childNodes ?? []
    const index = nodes.indexOf(child)
    invariant(index >= 0, 'Specified node is not a child of this element!')
    nodes.splice(index, 1, node)
    child.parentNode = null
    node.parentNode = parent
    child.ref.replaceWith(node.ref)
  },

  move(
    parent: ParentVirtualNode,
    child: VirtualNode,
    from: number,
    to: number,
  ) {
    const nodes = parent.childNodes ?? []
    invariant(
      nodes[from] === child,
      'Specified node is not a child of this element!',
    )
    nodes.splice(from, 1)
    nodes.splice(to, 0, child)
    // the DOM position is taken from the virtual children, as element
    // children would skip the text and comment nodes
    const nextChild = nodes[to + 1]
    parent.ref.insertBefore(child.ref, nextChild ? nextChild.ref : null)
  },

  remove(parent: ParentVirtualNode, child: VirtualNode) {
    const nodes = parent.childNodes ?? []
    const index = nodes.indexOf(child)
    invariant(index >= 0, 'Specified node is not a child of this element!')
    nodes.splice(index, 1)
    if (!nodes.length) {
      parent.childNodes = undefined
    }
    parent.ref.removeChild(child.ref)
  },
}

const CoreTypes = {
  VirtualNode,
  Component,
  WebComponent,
  Root: WebComponent,
  VirtualElement,
  Comment,
  Text,
}

export {
  VirtualNode,
  Component,
  WebComponent,
  WebComponent as Root,
  VirtualElement,
  Comment,
  Text,
}

export default CoreTypes
