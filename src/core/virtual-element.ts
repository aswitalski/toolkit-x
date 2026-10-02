import ChildNodes from './child-nodes.js'
import type { ElementDescription } from './description.js'
import DOM from './dom.js'
import VirtualNode from './virtual-node.js'
import type WebComponent from './web-component.js'

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

  attachDOM() {
    this.ref = DOM.createElement(this.description)
  }
}

export default VirtualElement
