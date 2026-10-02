import type Comment from './comment.js'
import type Component from './component.js'
import type { NodeDescription } from './description.js'
import type Text from './text.js'
import type VirtualElement from './virtual-element.js'
import type WebComponent from './web-component.js'

/* The DOM node rendered for a virtual node. */
export type NodeRef = Element | CharacterData

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
    return this.nodeType === 'root'
  }

  isComponent(): this is Component {
    const { nodeType } = this
    return nodeType === 'component' || nodeType === 'root'
  }

  isElement(): this is VirtualElement {
    return this.nodeType === 'element'
  }

  isComment(): this is Comment {
    return this.nodeType === 'comment'
  }

  isText(): this is Text {
    return this.nodeType === 'text'
  }

  isCompatible(node: VirtualNode | null | undefined) {
    return node && this.nodeType === node.nodeType && this.key === node.key
  }
}

export default VirtualNode
