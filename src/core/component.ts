import type { Child, RenderResult } from './bragi.js'
import {
  CommentDescription,
  type ComponentDescription,
  type NodeDescription,
  type Props,
} from './description.js'
import type Dispatcher from './dispatcher.js'
import type { Commands, CommandsAPI } from './dispatcher.js'
import { runtime } from './runtime.js'
import Sandbox, { type ComponentSandbox } from './sandbox.js'
import Template from './template.js'
import { type AnyFunction, invariant } from './utils.js'
import VirtualNode, { type NodeRef } from './virtual-node.js'
import type WebComponent from './web-component.js'

/* A task run when a component is destroyed, e.g. disconnecting a service. */
export type CleanUpTask = (() => void) & { service?: unknown }

/* A service components connect to, e.g. a subclass of Service. */
export interface Connectable {
  connect(listeners: Record<string, unknown>): () => void
}

/* The class of any component, whatever its props. */
export type ComponentClass = typeof Component<object>

/*
 * Node representing Component in the virtual DOM tree.
 * Components
 */
class Component<P extends object = object> extends VirtualNode {
  static NodeType = 'component'

  declare static elementName?: string
  declare static defaultProps?: Props
  declare static commands?: CommandsAPI | CommandsAPI[]

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
    this.sandbox = Sandbox.create(this, COMPONENT_PROPERTIES)
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

/* The properties of the Component class hidden from the sandbox. */
const COMPONENT_PROPERTIES = Object.getOwnPropertyNames(Component.prototype)

export default Component
