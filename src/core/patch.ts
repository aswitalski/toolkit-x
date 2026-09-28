import type { Listener, NodeDescription } from './description.js'
import type {
  Component,
  VirtualElement,
  VirtualNode,
  WebComponent,
} from './nodes.js'
import utils from './utils.js'

/* A node rendered as an HTML element, e.g. a root with a custom element. */
type PatchTarget = VirtualNode & { ref: HTMLElement }

/* Style and properties are set by name, as by the original assignments. */
type StyleMap = Record<string, string | null>
type PropertyMap = Record<string, unknown>

const Type = {
  INIT_ROOT_COMPONENT: 'init-root-component',
  UPDATE_NODE: 'update-node',
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
  | { type: 'insert-child'; node: VirtualNode; at: number; parent: VirtualNode }
  | {
      type: 'replace-child'
      child: VirtualNode
      node: VirtualNode
      parent: VirtualNode
    }
  | {
      type: 'move-child'
      child: VirtualNode
      from: number
      to: number
      parent: VirtualNode
    }
  | {
      type: 'remove-child'
      child: VirtualNode
      at: number
      parent: VirtualNode
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
      case Type.SET_ATTRIBUTE: {
        const attr = patch.isCustom
          ? patch.name
          : utils.getAttributeName(patch.name)
        patch.target.ref.setAttribute(attr, patch.value)
        return
      }
      case Type.REMOVE_ATTRIBUTE: {
        const attr = patch.isCustom
          ? patch.name
          : utils.getAttributeName(patch.name)
        patch.target.ref.removeAttribute(attr)
        return
      }
      case Type.SET_DATA_ATTRIBUTE:
        patch.target.ref.dataset[patch.name] = patch.value
        return
      case Type.REMOVE_DATA_ATTRIBUTE:
        delete patch.target.ref.dataset[patch.name]
        return
      case Type.SET_STYLE_PROPERTY:
        if (patch.property.startsWith('--')) {
          patch.target.ref.style.setProperty(patch.property, ` ${patch.value}`)
        } else {
          ;(patch.target.ref.style as unknown as StyleMap)[patch.property] =
            patch.value
        }
        return
      case Type.REMOVE_STYLE_PROPERTY:
        if (patch.property.startsWith('--')) {
          patch.target.ref.style.removeProperty(patch.property)
        } else {
          ;(patch.target.ref.style as unknown as StyleMap)[patch.property] =
            null
        }
        return
      case Type.SET_CLASS_NAME:
        patch.target.ref.className = patch.className
        return
      case Type.ADD_LISTENER: {
        const event = patch.isCustom
          ? patch.name
          : utils.getEventName(patch.name)
        patch.target.ref.addEventListener(event, patch.listener)
        return
      }
      case Type.REPLACE_LISTENER: {
        const event = patch.isCustom
          ? patch.name
          : utils.getEventName(patch.name)
        patch.target.ref.removeEventListener(event, patch.removed)
        patch.target.ref.addEventListener(event, patch.added)
        return
      }
      case Type.REMOVE_LISTENER: {
        const event = patch.isCustom
          ? patch.name
          : utils.getEventName(patch.name)
        patch.target.ref.removeEventListener(event, patch.listener)
        return
      }
      case Type.SET_PROPERTY:
        ;(patch.target.ref as unknown as PropertyMap)[patch.key] = patch.value
        return
      case Type.DELETE_PROPERTY:
        delete (patch.target.ref as unknown as PropertyMap)[patch.key]
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

  insertChild(
    node: VirtualNode,
    at: number,
    parent: VirtualNode,
  ): PatchOf<'insert-child'> {
    return { type: Type.INSERT_CHILD, node, at, parent }
  },

  moveChild(
    child: VirtualNode,
    from: number,
    to: number,
    parent: VirtualNode,
  ): PatchOf<'move-child'> {
    return { type: Type.MOVE_CHILD, child, from, to, parent }
  },

  replaceChild(
    child: VirtualNode,
    node: VirtualNode,
    parent: VirtualNode,
  ): PatchOf<'replace-child'> {
    return { type: Type.REPLACE_CHILD, child, node, parent }
  },

  removeChild(
    child: VirtualNode,
    at: number,
    parent: VirtualNode,
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
