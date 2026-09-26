import {
  CommentDescription,
  type ComponentDescription,
  type ElementDescription,
  type NodeDescription,
  type Props,
  type TextDescription,
} from './description.js'
import Dispatcher, { type Commands, type CommandsAPI } from './dispatcher.js'
import Plugins from './plugins.js'
import type { Reducer, State } from './reducers.js'
import Renderer from './renderer.js'
import Sandbox, { type ComponentSandbox } from './sandbox.js'
import Template from './template.js'
import { toolkit } from './toolkit.js'
import VirtualDOM from './virtual-dom.js'

/* The DOM node rendered for a virtual node. */
export type NodeRef = Element | CharacterData

/* A task run when a component is destroyed, e.g. disconnecting a service. */
export type CleanUpTask = (() => void) & { service?: unknown }

export interface Service {
  connect(listeners: Record<string, unknown>): () => void
}

export type ComponentClass = typeof Component

/*
 * An abstract parent node.
 */
abstract class VirtualNode {
  declare description: NodeDescription
  declare key?: string
  declare parentNode: VirtualNode | null
  declare context: WebComponent | null
  declare children?: VirtualNode[]

  abstract ref: NodeRef
  abstract get nodeType(): string
  abstract attachDOM(): void
  abstract detachDOM(): void

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

  createChildren() {
    this.children = this.description.children!.map(childDescription =>
      this.createChild(childDescription)!,
    )
  }

  createChild(description: NodeDescription): VirtualNode | null {
    return VirtualDOM.createFromDescription(description, this, this.context)
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

  attachChildren() {
    if (this.children) {
      for (const child of this.children) {
        this.ref.appendChild(child.ref)
      }
    }
  }

  insertChild(child: VirtualNode, index?: number) {
    if (!this.children) {
      this.children = []
    }
    if (index === undefined) {
      index = this.children.length
    }
    const nextChild = this.children[index]
    this.children.splice(index, 0, child)
    this.ref.insertBefore(child.ref, (nextChild && nextChild.ref) || null)
    child.parentNode = this
  }

  replaceChild(child: VirtualNode, node: VirtualNode) {
    const index = this.children!.indexOf(child)
    toolkit.assert(index >= 0, 'Specified node is not a child of this element!')
    this.children!.splice(index, 1, node)
    child.parentNode = null
    node.parentNode = this
    child.ref.replaceWith(node.ref)
  }

  moveChild(child: VirtualNode, from: number, to: number) {
    toolkit.assert(
      this.children![from] === child,
      'Specified node is not a child of this element!',
    )
    this.children!.splice(from, 1)
    this.children!.splice(to, 0, child)
    this.ref.removeChild(child.ref)
    this.ref.insertBefore(child.ref, (this.ref as Element).children[to] ?? null)
  }

  removeChild(child: VirtualNode) {
    const index = this.children!.indexOf(child)
    toolkit.assert(index >= 0, 'Specified node is not a child of this element!')
    this.children!.splice(index, 1)
    if (!this.children!.length) {
      delete this.children
    }
    this.ref.removeChild(child.ref)
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
class Component extends VirtualNode {
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
  declare props: Props

  onCreated?(): void
  onAttached?(): void
  onPropsReceived?(nextProps: Props): void
  onUpdated?(prevProps: Props): void
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
    toolkit.assert(
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

  connectTo(service: Service, listeners: Record<string, unknown>) {
    toolkit.assert(
      typeof service.connect === 'function',
      'Services have to define the connect() method',
    )
    const disconnect: CleanUpTask = service.connect(listeners)
    toolkit.assert(
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

  render(): unknown {
    return undefined
  }

  get commands(): Commands {
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

  detachDOM() {
    if (this.content) {
      this.content.detachDOM()
    }
  }
}

const CONTAINER = Symbol('container')
const CUSTOM_ELEMENT = Symbol('custom-element')
const DISPATCHER = Symbol('dispatcher')

class WebComponent extends Component {
  static NodeType = 'root'

  static styles: string[] = []

  declare subroots: Set<WebComponent>
  declare ready: Promise<void>
  declare markAsReady: () => void
  declare plugins: Plugins | null
  declare shadow: ShadowRoot | null
  declare state?: State
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
    this.subroots = new Set()
    this.dispatcher = new Dispatcher(this)
    this.ready = new Promise(resolve => {
      this.markAsReady = resolve
    })
    this.plugins = this.createPlugins()
    this.content = this.createPlaceholder()
    this.shadow = null
    this.attachDOM()
  }

  attachDOM() {
    if ((this.constructor as typeof WebComponent).elementName) {
      this.ref = Renderer.createCustomElement(this)
      this.plugins!.installAll()
      if (this.description.children) {
        this.createChildren()
        this.attachChildren()
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
    toolkit.track(this)

    const state = await this.getInitialState.call(
      this.sandbox,
      this.description.props || {},
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

  setState(state: State) {
    if (state.constructor !== Object) {
      throw new Error('Web Component state must be a plain object!')
    }
    this.commands.setState(
      Template.normalizeComponentProps(
        state,
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
      description.props || {},
      this.state || {},
    )
    this.setState(state)
  }

  /**
   * The default implementation delegating the calculation of initial state
   * to the state manager.
   */
  async getInitialState(props: Props): Promise<State> {
    return {
      ...props,
    }
  }

  /**
   * The default implementation delegating the calculation of updated state
   * to the state manager.
   */
  getUpdatedState(props: Props, state: State): State {
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

  get commands(): Commands {
    return this.dispatcher.commands
  }

  createPlugins(): Plugins {
    const plugins = new Plugins(this)
    const inherited = this.parentNode
      ? (this.parentNode as WebComponent).plugins
      : toolkit.plugins
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
    super.destroy()
    try {
      this.stopTracking!()
    } catch {
      return
    }
    this.dispatcher.ignoreIncoming()
    void this.plugins!.destroy()
    this.plugins = null
    this.parentNode = null
  }

  get nodeType(): string {
    return WebComponent.NodeType
  }
}

class VirtualElement extends VirtualNode {
  static NodeType = 'element'

  declare description: ElementDescription
  declare ref: HTMLElement

  constructor(
    description: ElementDescription,
    parent?: VirtualNode | null,
    context?: WebComponent | null,
  ) {
    super(description, parent, context)
    if (description.children) {
      this.createChildren()
    }
    this.attachDOM()
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

  attachDOM() {
    this.ref = Renderer.createElement(this.description)
    this.attachChildren()
  }

  detachDOM() {
    for (const child of this.children!) {
      child.detachDOM()
    }
    this.ref = null!
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

  detachDOM() {
    this.ref = null!
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

  detachDOM() {
    this.ref = null!
  }
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
