import { invariant } from './utils.js'
import type VirtualElement from './virtual-element.js'
import type VirtualNode from './virtual-node.js'
import type WebComponent from './web-component.js'

/*
 * A node with child nodes: an element, or a Web Component
 * with the child nodes rendered in its light DOM.
 */
export type ParentVirtualNode = VirtualElement | WebComponent

/*
 * Operations on the child nodes of the parent nodes, which store them
 * as `children` of an element or `childNodes` of a Web Component.
 */
const ChildNodes = {
  set(parent: ParentVirtualNode, nodes: VirtualNode[]) {
    parent.childNodes = nodes
    for (const child of nodes) {
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

export default ChildNodes
