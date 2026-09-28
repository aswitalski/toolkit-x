import type {
  ComponentDescription,
  Listener,
  NodeDescription,
} from './description.js'
import DOM from './dom.js'
import type {
  Component,
  ParentVirtualNode,
  VirtualElement,
  VirtualNode,
  WebComponent,
} from './nodes.js'

/* A node rendered as an HTML element, e.g. a root with a custom element. */
type PatchTarget = VirtualNode & { ref: HTMLElement }

const Type = {
  INIT_ROOT_COMPONENT: 'init-root-component',
  UPDATE_NODE: 'update-node',
  UPDATE_ROOT: 'update-root',
  SET_ATTRIBUTE: 'set-attribute',
  REMOVE_ATTRIBUTE: 'remove-attribute',
  SET_DATA_ATTRIBUTE: 'set-data-attribute',
  REMOVE_DATA_ATTRIBUTE: 'remove-data-attribute',
  SET_STYLE_PROPERTY: 'set-style-property',
  REMOVE_STYLE_PROPERTY: 'remove-style-property',
  SET_CLASS_NAME: 'set-class-name',
  ADD_LISTENER: 'add-listener',
  REPLACE_LISTENER: 'replace-listener',
  REMOVE_LISTENER: 'remove-listener',
  SET_PROPERTY: 'set-property',
  DELETE_PROPERTY: 'delete-property',
  INSERT_CHILD: 'insert-child',
  REPLACE_CHILD: 'replace-child',
  MOVE_CHILD: 'move-child',
  REMOVE_CHILD: 'remove-child',
  SET_CONTENT: 'set-content',
} as const

/*
 * A single change of the virtual and rendered DOM, applied by Patch.apply().
 */
type Patch =
  | { type: 'init-root-component'; root: WebComponent }
  | {
      type: 'update-node'
      node: VirtualNode
      prevDescription: NodeDescription
      description: NodeDescription
    }
  | {
      type: 'update-root'
      root: WebComponent
      description: ComponentDescription
    }
  | {
      type: 'set-attribute'
      name: string
      value: string
      target: PatchTarget
      isCustom: boolean
    }
  | {
      type: 'remove-attribute'
      name: string
      target: PatchTarget
      isCustom: boolean
    }
  | {
      type: 'set-data-attribute'
      name: string
      value: string
      target: PatchTarget
    }
  | { type: 'remove-data-attribute'; name: string; target: PatchTarget }
  | {
      type: 'set-style-property'
      property: string
      value: string
      target: PatchTarget
    }
  | { type: 'remove-style-property'; property: string; target: PatchTarget }
  | { type: 'set-class-name'; className: string; target: PatchTarget }
  | {
      type: 'add-listener'
      name: string
      listener: Listener
      target: PatchTarget
      isCustom: boolean
    }
  | {
      type: 'replace-listener'
      name: string
      removed: Listener
      added: Listener
      target: PatchTarget
      isCustom: boolean
    }
  | {
      type: 'remove-listener'
      name: string
      listener: Listener
      target: PatchTarget
      isCustom: boolean
    }
  | { type: 'set-property'; key: string; value: unknown; target: PatchTarget }
  | { type: 'delete-property'; key: string; target: PatchTarget }
  | {
      type: 'insert-child'
      node: VirtualNode
      at: number
      parent: ParentVirtualNode
    }
  | {
      type: 'replace-child'
      child: VirtualNode
      node: VirtualNode
      parent: ParentVirtualNode
    }
  | {
      type: 'move-child'
      child: VirtualNode
      from: number
      to: number
      parent: ParentVirtualNode
    }
  | {
      type: 'remove-child'
      child: VirtualNode
      at: number
      parent: ParentVirtualNode
    }
  | {
      type: 'set-content'
      node: VirtualNode
      child: VirtualNode
      parent: Component
    }

/* The patch of the given type. */
type PatchOf<T extends Patch['type']> = Extract<Patch, { type: T }>

const Patch = {
  Type,

  /**
   * Applies the change to the virtual and rendered DOM.
   */
  apply(patch: Patch) {
    switch (patch.type) {
      case Type.INIT_ROOT_COMPONENT: {
        const container = patch.root.container
          ? patch.root.container
          : patch.root.shadow!
        container.appendChild(patch.root.content!.ref)
        return
      }
      case Type.UPDATE_NODE:
        patch.node.description = patch.description
        return
      case Type.UPDATE_ROOT:
        patch.root.update(patch.description)
        return
      case Type.SET_ATTRIBUTE: {
        const { target, name, value, isCustom } = patch
        DOM.setAttribute(target.ref, name, value, isCustom)
        return
      }
      case Type.REMOVE_ATTRIBUTE:
        DOM.removeAttribute(patch.target.ref, patch.name, patch.isCustom)
        return
      case Type.SET_DATA_ATTRIBUTE:
        DOM.setDataAttribute(patch.target.ref, patch.name, patch.value)
        return
      case Type.REMOVE_DATA_ATTRIBUTE:
        DOM.removeDataAttribute(patch.target.ref, patch.name)
        return
      case Type.SET_STYLE_PROPERTY:
        DOM.setStyleProperty(patch.target.ref, patch.property, patch.value)
        return
      case Type.REMOVE_STYLE_PROPERTY:
        DOM.removeStyleProperty(patch.target.ref, patch.property)
        return
      case Type.SET_CLASS_NAME:
        DOM.setClassName(patch.target.ref, patch.className)
        return
      case Type.ADD_LISTENER: {
        const { target, name, listener, isCustom } = patch
        DOM.addListener(target.ref, name, listener, isCustom)
        return
      }
      case Type.REPLACE_LISTENER: {
        const { target, name, removed, added, isCustom } = patch
        DOM.removeListener(target.ref, name, removed, isCustom)
        DOM.addListener(target.ref, name, added, isCustom)
        return
      }
      case Type.REMOVE_LISTENER: {
        const { target, name, listener, isCustom } = patch
        DOM.removeListener(target.ref, name, listener, isCustom)
        return
      }
      case Type.SET_PROPERTY:
        DOM.setProperty(patch.target.ref, patch.key, patch.value)
        return
      case Type.DELETE_PROPERTY:
        DOM.deleteProperty(patch.target.ref, patch.key)
        return
      case Type.INSERT_CHILD:
        patch.parent.insertChild(patch.node, patch.at)
        return
      case Type.REPLACE_CHILD:
        patch.parent.replaceChild(patch.child, patch.node)
        return
      case Type.MOVE_CHILD:
        patch.parent.moveChild(patch.child, patch.from, patch.to)
        return
      case Type.REMOVE_CHILD:
        patch.parent.removeChild(patch.child)
        return
      case Type.SET_CONTENT:
        patch.parent.setContent(patch.node)
        return
      default: {
        // fails to compile when a patch type is not handled above
        const unsupported: never = patch
        throw new Error(
          `Unsupported patch type: ${(unsupported as Patch).type}`,
        )
      }
    }
  },

  initRootComponent(root: WebComponent): PatchOf<'init-root-component'> {
    return { type: Type.INIT_ROOT_COMPONENT, root }
  },

  updateNode(
    node: VirtualNode,
    description: NodeDescription,
  ): PatchOf<'update-node'> {
    return {
      type: Type.UPDATE_NODE,
      node,
      prevDescription: node.description,
      description,
    }
  },

  /* Passes the props to a nested root, which renders them itself. */
  updateRoot(
    root: WebComponent,
    description: ComponentDescription,
  ): PatchOf<'update-root'> {
    return { type: Type.UPDATE_ROOT, root, description }
  },

  insertChild(
    node: VirtualNode,
    at: number,
    parent: ParentVirtualNode,
  ): PatchOf<'insert-child'> {
    return { type: Type.INSERT_CHILD, node, at, parent }
  },

  moveChild(
    child: VirtualNode,
    from: number,
    to: number,
    parent: ParentVirtualNode,
  ): PatchOf<'move-child'> {
    return { type: Type.MOVE_CHILD, child, from, to, parent }
  },

  replaceChild(
    child: VirtualNode,
    node: VirtualNode,
    parent: ParentVirtualNode,
  ): PatchOf<'replace-child'> {
    return { type: Type.REPLACE_CHILD, child, node, parent }
  },

  removeChild(
    child: VirtualNode,
    at: number,
    parent: ParentVirtualNode,
  ): PatchOf<'remove-child'> {
    return { type: Type.REMOVE_CHILD, child, at, parent }
  },

  setContent(node: VirtualNode, parent: Component): PatchOf<'set-content'> {
    return { type: Type.SET_CONTENT, node, child: parent.content!, parent }
  },

  setAttribute(
    name: string,
    value: string,
    target: VirtualElement | WebComponent,
    isCustom: boolean,
  ): PatchOf<'set-attribute'> {
    return {
      type: Type.SET_ATTRIBUTE,
      name,
      value,
      target: target as PatchTarget,
      isCustom,
    }
  },

  removeAttribute(
    name: string,
    target: VirtualElement | WebComponent,
    isCustom: boolean,
  ): PatchOf<'remove-attribute'> {
    return {
      type: Type.REMOVE_ATTRIBUTE,
      name,
      target: target as PatchTarget,
      isCustom,
    }
  },

  setDataAttribute(
    name: string,
    value: string,
    target: VirtualElement,
  ): PatchOf<'set-data-attribute'> {
    return { type: Type.SET_DATA_ATTRIBUTE, name, value, target }
  },

  removeDataAttribute(
    name: string,
    target: VirtualElement,
  ): PatchOf<'remove-data-attribute'> {
    return { type: Type.REMOVE_DATA_ATTRIBUTE, name, target }
  },

  setStyleProperty(
    property: string,
    value: string,
    target: VirtualElement,
  ): PatchOf<'set-style-property'> {
    return { type: Type.SET_STYLE_PROPERTY, property, value, target }
  },

  removeStyleProperty(
    property: string,
    target: VirtualElement,
  ): PatchOf<'remove-style-property'> {
    return { type: Type.REMOVE_STYLE_PROPERTY, property, target }
  },

  setClassName(
    className: string,
    target: VirtualElement,
  ): PatchOf<'set-class-name'> {
    return { type: Type.SET_CLASS_NAME, className, target }
  },

  addListener(
    name: string,
    listener: Listener,
    target: VirtualElement,
    isCustom: boolean,
  ): PatchOf<'add-listener'> {
    return { type: Type.ADD_LISTENER, name, listener, target, isCustom }
  },

  replaceListener(
    name: string,
    removed: Listener,
    added: Listener,
    target: VirtualElement,
    isCustom: boolean,
  ): PatchOf<'replace-listener'> {
    return {
      type: Type.REPLACE_LISTENER,
      name,
      removed,
      added,
      target,
      isCustom,
    }
  },

  removeListener(
    name: string,
    listener: Listener,
    target: VirtualElement,
    isCustom: boolean,
  ): PatchOf<'remove-listener'> {
    return { type: Type.REMOVE_LISTENER, name, listener, target, isCustom }
  },

  setProperty(
    key: string,
    value: unknown,
    target: VirtualElement,
  ): PatchOf<'set-property'> {
    return { type: Type.SET_PROPERTY, key, value, target }
  },

  deleteProperty(
    key: string,
    target: VirtualElement,
  ): PatchOf<'delete-property'> {
    return { type: Type.DELETE_PROPERTY, key, target }
  },
}

export default Patch
