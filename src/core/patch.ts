import type { Listener, NodeDescription } from './description.js'
import type {
  Component,
  VirtualElement,
  VirtualNode,
  WebComponent,
} from './nodes.js'
import utils from './utils.js'

interface PatchDefinition {
  type: symbol
  apply: (this: Patch) => void
}

/* A node rendered as an HTML element, e.g. a root with a custom element. */
type PatchTarget = VirtualNode & { ref: HTMLElement }

/* Style and properties are set by name, as by the original assignments. */
type StyleMap = Record<string, string | null>
type PropertyMap = Record<string, unknown>

const INIT_ROOT_COMPONENT: PatchDefinition = {
  type: Symbol('init-root-component'),
  apply: function (this: Patch) {
    const container = this.root.container
      ? this.root.container
      : this.root.shadow!
    container.appendChild(this.root.content!.ref)
  },
}
const UPDATE_NODE: PatchDefinition = {
  type: Symbol('update-node'),
  apply: function (this: Patch) {
    this.node.description = this.description
  },
}

const SET_ATTRIBUTE: PatchDefinition = {
  type: Symbol('set-attribute'),
  apply: function (this: Patch) {
    const attr = this.isCustom ? this.name : utils.getAttributeName(this.name)
    this.target.ref.setAttribute(attr, this.value as string)
  },
}
const REMOVE_ATTRIBUTE: PatchDefinition = {
  type: Symbol('remove-attribute'),
  apply: function (this: Patch) {
    const attr = this.isCustom ? this.name : utils.getAttributeName(this.name)
    this.target.ref.removeAttribute(attr)
  },
}

const SET_DATA_ATTRIBUTE: PatchDefinition = {
  type: Symbol('set-data-attribute'),
  apply: function (this: Patch) {
    this.target.ref.dataset[this.name] = this.value as string
  },
}
const REMOVE_DATA_ATTRIBUTE: PatchDefinition = {
  type: Symbol('remove-data-attribute'),
  apply: function (this: Patch) {
    delete this.target.ref.dataset[this.name]
  },
}

const SET_STYLE_PROPERTY: PatchDefinition = {
  type: Symbol('set-style-property'),
  apply: function (this: Patch) {
    if (this.property.startsWith('--')) {
      this.target.ref.style.setProperty(
        this.property,
        ` ${this.value as string}`,
      )
    } else {
      ;(this.target.ref.style as unknown as StyleMap)[this.property] = this
        .value as string
    }
  },
}
const REMOVE_STYLE_PROPERTY: PatchDefinition = {
  type: Symbol('remove-style-property'),
  apply: function (this: Patch) {
    if (this.property.startsWith('--')) {
      this.target.ref.style.removeProperty(this.property)
    } else {
      ;(this.target.ref.style as unknown as StyleMap)[this.property] = null
    }
  },
}

const SET_CLASS_NAME: PatchDefinition = {
  type: Symbol('set-class-name'),
  apply: function (this: Patch) {
    this.target.ref.className = this.className
  },
}

const ADD_LISTENER: PatchDefinition = {
  type: Symbol('add-listener'),
  apply: function (this: Patch) {
    const event = this.isCustom ? this.name : utils.getEventName(this.name)
    this.target.ref.addEventListener(event, this.listener)
  },
}
const REPLACE_LISTENER: PatchDefinition = {
  type: Symbol('replace-listener'),
  apply: function (this: Patch) {
    const event = this.isCustom ? this.name : utils.getEventName(this.name)
    this.target.ref.removeEventListener(event, this.removed)
    this.target.ref.addEventListener(event, this.added)
  },
}
const REMOVE_LISTENER: PatchDefinition = {
  type: Symbol('remove-listener'),
  apply: function (this: Patch) {
    const event = this.isCustom ? this.name : utils.getEventName(this.name)
    this.target.ref.removeEventListener(event, this.listener)
  },
}

const SET_PROPERTY: PatchDefinition = {
  type: Symbol('set-property'),
  apply: function (this: Patch) {
    ;(this.target.ref as unknown as PropertyMap)[this.key] = this.value
  },
}
const DELETE_PROPERTY: PatchDefinition = {
  type: Symbol('delete-property'),
  apply: function (this: Patch) {
    delete (this.target.ref as unknown as PropertyMap)[this.key]
  },
}

const INSERT_CHILD: PatchDefinition = {
  type: Symbol('insert-child'),
  apply: function (this: Patch) {
    this.parent.insertChild(this.node, this.at)
  },
}
const REPLACE_CHILD: PatchDefinition = {
  type: Symbol('replace-child'),
  apply: function (this: Patch) {
    this.parent.replaceChild(this.child, this.node)
  },
}
const MOVE_CHILD: PatchDefinition = {
  type: Symbol('move-child'),
  apply: function (this: Patch) {
    this.parent.moveChild(this.child, this.from, this.to)
  },
}
const REMOVE_CHILD: PatchDefinition = {
  type: Symbol('remove-child'),
  apply: function (this: Patch) {
    this.parent.removeChild(this.child)
  },
}

const SET_CONTENT: PatchDefinition = {
  type: Symbol('set-content'),
  apply: function (this: Patch) {
    ;(this.parent as Component).setContent(this.node)
  },
}

const Types = {
  INIT_ROOT_COMPONENT,
  UPDATE_NODE,
  SET_ATTRIBUTE,
  REMOVE_ATTRIBUTE,
  SET_DATA_ATTRIBUTE,
  REMOVE_DATA_ATTRIBUTE,
  SET_STYLE_PROPERTY,
  REMOVE_STYLE_PROPERTY,
  SET_CLASS_NAME,
  ADD_LISTENER,
  REPLACE_LISTENER,
  REMOVE_LISTENER,
  SET_PROPERTY,
  DELETE_PROPERTY,
  INSERT_CHILD,
  REPLACE_CHILD,
  MOVE_CHILD,
  REMOVE_CHILD,
  SET_CONTENT,
}
type PatchName = keyof typeof Types

const PatchTypes = (Object.keys(Types) as PatchName[]).reduce(
  (result, key) => {
    result[key] = Types[key].type
    return result
  },
  {} as Record<PatchName, symbol>,
)

/*
 * A single change of the virtual and rendered DOM. The fields are set by
 * the factory method of the given patch type.
 */
class Patch {
  declare type: symbol
  declare apply: () => void
  declare root: WebComponent
  declare node: VirtualNode
  declare child: VirtualNode
  declare parent: VirtualNode
  declare description: NodeDescription
  declare prevDescription: NodeDescription
  declare at: number
  declare from: number
  declare to: number
  declare name: string
  declare value: unknown
  declare target: PatchTarget
  declare isCustom: boolean
  declare property: string
  declare className: string
  declare listener: Listener
  declare removed: Listener
  declare added: Listener
  declare key: string

  constructor(def: PatchDefinition) {
    this.type = def.type
    this.apply = def.apply
  }

  static initRootComponent(root: WebComponent) {
    const patch = new Patch(INIT_ROOT_COMPONENT)
    patch.root = root
    return patch
  }

  static updateNode(node: VirtualNode, description: NodeDescription) {
    const patch = new Patch(UPDATE_NODE)
    patch.node = node
    patch.prevDescription = node.description
    patch.description = description
    return patch
  }

  static insertChild(node: VirtualNode, at: number, parent: VirtualNode) {
    const patch = new Patch(INSERT_CHILD)
    patch.node = node
    patch.at = at
    patch.parent = parent
    return patch
  }

  static moveChild(
    child: VirtualNode,
    from: number,
    to: number,
    parent: VirtualNode,
  ) {
    const patch = new Patch(MOVE_CHILD)
    patch.child = child
    patch.from = from
    patch.to = to
    patch.parent = parent
    return patch
  }

  static replaceChild(
    child: VirtualNode,
    node: VirtualNode,
    parent: VirtualNode,
  ) {
    const patch = new Patch(REPLACE_CHILD)
    patch.child = child
    patch.node = node
    patch.parent = parent
    return patch
  }

  static removeChild(child: VirtualNode, at: number, parent: VirtualNode) {
    const patch = new Patch(REMOVE_CHILD)
    patch.child = child
    patch.at = at
    patch.parent = parent
    return patch
  }

  static setContent(node: VirtualNode, parent: Component) {
    const patch = new Patch(SET_CONTENT)
    patch.node = node
    patch.child = parent.content!
    patch.parent = parent
    return patch
  }

  static setAttribute(
    name: string,
    value: string,
    target: VirtualElement | WebComponent,
    isCustom: boolean,
  ) {
    const patch = new Patch(SET_ATTRIBUTE)
    patch.name = name
    patch.value = value
    patch.target = target as PatchTarget
    patch.isCustom = isCustom
    return patch
  }

  static removeAttribute(
    name: string,
    target: VirtualElement | WebComponent,
    isCustom: boolean,
  ) {
    const patch = new Patch(REMOVE_ATTRIBUTE)
    patch.name = name
    patch.target = target as PatchTarget
    patch.isCustom = isCustom
    return patch
  }

  static setDataAttribute(name: string, value: string, target: VirtualElement) {
    const patch = new Patch(SET_DATA_ATTRIBUTE)
    patch.name = name
    patch.value = value
    patch.target = target
    return patch
  }

  static removeDataAttribute(name: string, target: VirtualElement) {
    const patch = new Patch(REMOVE_DATA_ATTRIBUTE)
    patch.name = name
    patch.target = target
    return patch
  }

  static setStyleProperty(
    property: string,
    value: string,
    target: VirtualElement,
  ) {
    const patch = new Patch(SET_STYLE_PROPERTY)
    patch.property = property
    patch.value = value
    patch.target = target
    return patch
  }

  static removeStyleProperty(property: string, target: VirtualElement) {
    const patch = new Patch(REMOVE_STYLE_PROPERTY)
    patch.property = property
    patch.target = target
    return patch
  }

  static setClassName(className: string, target: VirtualElement) {
    const patch = new Patch(SET_CLASS_NAME)
    patch.className = className
    patch.target = target
    return patch
  }

  static addListener(
    name: string,
    listener: Listener,
    target: VirtualElement,
    isCustom: boolean,
  ) {
    const patch = new Patch(ADD_LISTENER)
    patch.name = name
    patch.listener = listener
    patch.target = target
    patch.isCustom = isCustom
    return patch
  }

  static replaceListener(
    name: string,
    removed: Listener,
    added: Listener,
    target: VirtualElement,
    isCustom: boolean,
  ) {
    const patch = new Patch(REPLACE_LISTENER)
    patch.name = name
    patch.removed = removed
    patch.added = added
    patch.target = target
    patch.isCustom = isCustom
    return patch
  }

  static removeListener(
    name: string,
    listener: Listener,
    target: VirtualElement,
    isCustom: boolean,
  ) {
    const patch = new Patch(REMOVE_LISTENER)
    patch.name = name
    patch.listener = listener
    patch.target = target
    patch.isCustom = isCustom
    return patch
  }

  static setProperty(key: string, value: unknown, target: VirtualElement) {
    const patch = new Patch(SET_PROPERTY)
    patch.key = key
    patch.value = value
    patch.target = target
    return patch
  }

  static deleteProperty(key: string, target: VirtualElement) {
    const patch = new Patch(DELETE_PROPERTY)
    patch.key = key
    patch.target = target
    return patch
  }

  static Type = PatchTypes
}

export default Patch
