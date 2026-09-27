import type {
  ComponentDescription,
  ElementDescription,
  Listener,
  NodeDescription,
} from './description.js'
import Lifecycle from './lifecycle.js'
import type {
  Component,
  ParentVirtualNode,
  VirtualElement,
  VirtualNode,
  WebComponent,
} from './nodes.js'
import Patch from './patch.js'
import Reconciler from './reconciler.js'
import type { State } from './reducers.js'
import Renderer from './renderer.js'
import Template from './template.js'
import { toolkit } from './toolkit.js'
import VirtualDOM from './virtual-dom.js'

class Diff {
  declare root: WebComponent
  declare patches: Patch[]

  /**
   * Creates a new instance bound to a root component
   * with an empty list of patches.
   */
  constructor(
    root: WebComponent,
    currentState: State | undefined,
    nextState: State,
  ) {
    this.root = root
    this.patches = []
    this.calculate(currentState, nextState)
  }

  /**
   * Adds the patch to the underlying list.
   */
  addPatch(patch: Patch) {
    return this.patches.push(patch)
  }

  /**
   * Applies all the patches onto the bound root node.
   */
  apply(): Patch[] {
    if (this.patches.length) {
      Lifecycle.beforeUpdate(this.patches)
      for (const patch of this.patches) {
        patch.apply()
      }
      Lifecycle.afterUpdate(this.patches)
    }
    return this.patches
  }

  /**
   * Calculates and returns all patches needed for transformation
   * of the rendered DOM fragment from one state to another.
   */
  calculate(currentState: State | undefined, nextState: State) {
    if (!currentState) {
      this.addPatch(Patch.initRootComponent(this.root))
    }

    if (Diff.deepEqual(currentState, nextState)) {
      return []
    }

    const template: unknown[] = [this.root.constructor, nextState]
    if (this.root.description.children) {
      template.push(
        ...this.root.description.children.map(child => child.asTemplate),
      )
    }

    const description = Template.describe(template) as ComponentDescription

    this.componentPatches(this.root, description)
    if (this.root.description.attrs || description.attrs) {
      this.attributePatches(
        this.root.description.attrs,
        description.attrs,
        this.root,
        true,
      )
    }
  }

  /**
   * Renders the descendants with normalized props and children passed
   * from the parent component.
   *
   * Calculates the patches needed for transformation of a component
   * to match the given description.
   */
  componentPatches(component: Component, description: ComponentDescription) {
    if (
      component.isInitialized &&
      Diff.deepEqual(component.description, description)
    ) {
      return
    }

    const nodeDescription = Renderer.render(
      component,
      description.props,
      description.childrenAsTemplates,
    )
    this.componentContentPatches(nodeDescription, component)

    this.addPatch(Patch.updateNode(component, description))
  }

  componentContentPatches(
    description: NodeDescription | null,
    parent: Component,
  ) {
    const content = parent.content

    if (!content && !description) {
      return
    }

    // insert
    if (!content && description) {
      throw new Error('Invalid component state!')
    }

    // remove
    if (content && !description) {
      throw new Error('Invalid component state!')
    }

    // update
    if (content!.description.isCompatible(description!)) {
      if (Diff.deepEqual(content!.description, description)) {
        return
      }
      this.childPatches(content!, description!)
      return
    }

    // replace
    const node = VirtualDOM.createFromDescription(
      description,
      parent,
      this.root,
    )
    this.addPatch(Patch.setContent(node!, parent))
  }

  /**
   * Calculates patches for transformation of specified child node
   * to match given description.
   */
  childPatches(child: VirtualNode, description: NodeDescription): void {
    if (child.isComponent()) {
      if (child.isRoot()) {
        // the child nodes of a Web Component are rendered in the light DOM
        const parent = child as unknown as ParentVirtualNode
        this.childrenPatches(parent.children, description.children, child)
        this.addPatch(Patch.updateNode(child, description))
        return child.update(description as ComponentDescription)
      }
      return this.componentPatches(child, description as ComponentDescription)
    }
    if (child.isElement()) {
      return this.elementPatches(child, description as ElementDescription)
    }
    throw new Error(`Unsupported node type: ${child.nodeType}`)
  }

  /**
   * Calculates patches for transformation of an element to match given
   * description.
   */
  elementPatches(element: VirtualElement, description: ElementDescription) {
    if (Diff.deepEqual(element.description, description)) {
      return
    }

    this.classNamePatches(element.description.class, description.class, element)
    this.stylePatches(element.description.style, description.style, element)
    this.attributePatches(element.description.attrs, description.attrs, element)
    this.listenerPatches(
      element.description.listeners,
      description.listeners,
      element,
    )
    this.datasetPatches(
      element.description.dataset,
      description.dataset,
      element,
    )
    this.propertiesPatches(
      element.description.properties,
      description.properties,
      element,
    )

    if (element.description.custom || description.custom) {
      this.attributePatches(
        element.description.custom && element.description.custom.attrs,
        description.custom && description.custom.attrs,
        element,
        true,
      )
      this.listenerPatches(
        element.description.custom && element.description.custom.listeners,
        description.custom && description.custom.listeners,
        element,
        true,
      )
    }

    if (element.children || description.children) {
      this.childrenPatches(element.children, description.children, element)
    }
    this.addPatch(Patch.updateNode(element, description))
  }

  classNamePatches(current = '', next = '', target: VirtualElement) {
    if (current !== next) {
      this.addPatch(Patch.setClassName(next, target))
    }
  }

  stylePatches(
    current: Record<string, string> = {},
    next: Record<string, string> = {},
    target: VirtualElement,
  ) {
    const props = Object.keys(current)
    const nextProps = Object.keys(next)

    const added = nextProps.filter(prop => !props.includes(prop))
    const removed = props.filter(prop => !nextProps.includes(prop))
    const changed = props.filter(
      prop => nextProps.includes(prop) && current[prop] !== next[prop],
    )

    for (const prop of added) {
      this.addPatch(Patch.setStyleProperty(prop, next[prop]!, target))
    }
    for (const prop of removed) {
      this.addPatch(Patch.removeStyleProperty(prop, target))
    }
    for (const prop of changed) {
      this.addPatch(Patch.setStyleProperty(prop, next[prop]!, target))
    }
  }

  attributePatches(
    current: Record<string, string> = {},
    next: Record<string, string> = {},
    target: VirtualElement | WebComponent,
    isCustom = false,
  ) {
    const attrs = Object.keys(current)
    const nextAttrs = Object.keys(next)

    const added = nextAttrs.filter(attr => !attrs.includes(attr))
    const removed = attrs.filter(attr => !nextAttrs.includes(attr))
    const changed = attrs.filter(
      attr => nextAttrs.includes(attr) && current[attr] !== next[attr],
    )

    for (const attr of added) {
      this.addPatch(Patch.setAttribute(attr, next[attr]!, target, isCustom))
    }
    for (const attr of removed) {
      this.addPatch(Patch.removeAttribute(attr, target, isCustom))
    }
    for (const attr of changed) {
      this.addPatch(Patch.setAttribute(attr, next[attr]!, target, isCustom))
    }
  }

  listenerPatches(
    current: Record<string, Listener> = {},
    next: Record<string, Listener> = {},
    target: VirtualElement,
    isCustom = false,
  ) {
    const listeners = Object.keys(current)
    const nextListeners = Object.keys(next)

    const added = nextListeners.filter(event => !listeners.includes(event))
    const removed = listeners.filter(event => !nextListeners.includes(event))
    const changed = listeners.filter(
      event =>
        nextListeners.includes(event) &&
        current[event] !== next[event] &&
        ((current[event]!.source === undefined &&
          next[event]!.source === undefined) ||
          current[event]!.source !== next[event]!.source),
    )

    for (const event of added) {
      this.addPatch(Patch.addListener(event, next[event]!, target, isCustom))
    }
    for (const event of removed) {
      this.addPatch(
        Patch.removeListener(event, current[event]!, target, isCustom),
      )
    }
    for (const event of changed) {
      this.addPatch(
        Patch.replaceListener(
          event,
          current[event]!,
          next[event]!,
          target,
          isCustom,
        ),
      )
    }
  }

  datasetPatches(
    current: Record<string, string> = {},
    next: Record<string, string> = {},
    target: VirtualElement,
  ) {
    const attrs = Object.keys(current)
    const nextAttrs = Object.keys(next)

    const added = nextAttrs.filter(attr => !attrs.includes(attr))
    const removed = attrs.filter(attr => !nextAttrs.includes(attr))
    const changed = attrs.filter(
      attr => nextAttrs.includes(attr) && current[attr] !== next[attr],
    )

    for (const attr of added) {
      this.addPatch(Patch.setDataAttribute(attr, next[attr]!, target))
    }
    for (const attr of removed) {
      this.addPatch(Patch.removeDataAttribute(attr, target))
    }
    for (const attr of changed) {
      this.addPatch(Patch.setDataAttribute(attr, next[attr]!, target))
    }
  }

  propertiesPatches(
    current: Record<string, unknown> = {},
    next: Record<string, unknown> = {},
    target: VirtualElement,
  ) {
    const keys = Object.keys(current)
    const nextKeys = Object.keys(next)

    const added = nextKeys.filter(key => !keys.includes(key))
    const removed = keys.filter(key => !nextKeys.includes(key))
    const changed = keys.filter(
      key => nextKeys.includes(key) && !Diff.deepEqual(current[key], next[key]),
    )

    for (const key of added) {
      this.addPatch(Patch.setProperty(key, next[key], target))
    }
    for (const key of removed) {
      this.addPatch(Patch.deleteProperty(key, target))
    }
    for (const key of changed) {
      this.addPatch(Patch.setProperty(key, next[key], target))
    }
  }

  childrenPatches(
    sourceNodes: VirtualNode[] = [],
    targetDescriptions: NodeDescription[] = [],
    parent: VirtualNode,
  ) {
    const Move = Reconciler.Move

    const created: VirtualNode[] = []
    const createdNodesMap = new Map<string, VirtualNode>()

    const createNode = (description: NodeDescription, key: string) => {
      const node = VirtualDOM.createFromDescription(
        description,
        parent,
        this.root,
      )
      created.push(node!)
      createdNodesMap.set(key, node!)
      return node!
    }

    const from = sourceNodes.map(
      (node, index) => node.key || Diff.createKey(index),
    )
    const to = targetDescriptions.map(
      (description, index) => description.key || Diff.createKey(index),
    )

    const getNode = (key: string, isMove: boolean): VirtualNode => {
      if (from.includes(key)) {
        return sourceNodes[from.indexOf(key)]!
      }
      if (isMove) {
        return createdNodesMap.get(key)!
      }
      const index = to.indexOf(key)
      return createNode(targetDescriptions[index]!, key)
    }

    if (toolkit.isDebug()) {
      const assertUniqueKeys = (keys: string[]) => {
        if (keys.length) {
          const uniqueKeys = [...new Set(keys)]
          if (uniqueKeys.length !== keys.length) {
            throw new Error(`Non-unique keys detected in: ${keys.join(', ')}`)
          }
        }
      }
      assertUniqueKeys(from)
      assertUniqueKeys(to)
    }

    const nodeFavoredToMove = sourceNodes.find(
      node =>
        (node.description as ComponentDescription).props &&
        (node.description as ComponentDescription).props!.beingDragged,
    )

    const moves = Reconciler.calculateMoves(
      from,
      to,
      nodeFavoredToMove && nodeFavoredToMove.key,
    )

    const children = [...sourceNodes]
    for (const move of moves) {
      const node = getNode(move.item, move.name === Move.Name.MOVE)
      switch (move.name) {
        case Move.Name.REMOVE:
          this.addPatch(Patch.removeChild(node, move.at!, parent))
          Move.remove(node, move.at!).make(children)
          continue
        case Move.Name.INSERT:
          this.addPatch(Patch.insertChild(node, move.at!, parent))
          Move.insert(node, move.at!).make(children)
          continue
        case Move.Name.MOVE:
          this.addPatch(Patch.moveChild(node, move.from!, move.to!, parent))
          Move.move(node, move.from!, move.to!).make(children)
          continue
      }
    }
    for (let i = 0; i < children.length; i++) {
      const child = children[i]!
      if (!created.includes(child)) {
        const targetDescription = targetDescriptions[i]!
        this.elementChildPatches(child, targetDescription, parent)
      }
    }
  }

  elementChildPatches(
    child: VirtualNode,
    description: NodeDescription,
    parent: VirtualNode,
  ) {
    if (child.description.isCompatible(description)) {
      if (Diff.deepEqual(child.description, description)) {
        return
      }
      this.childPatches(child, description)
    } else {
      const node = VirtualDOM.createFromDescription(
        description,
        parent,
        this.root,
      )
      this.addPatch(Patch.replaceChild(child, node!, parent))
    }
  }

  /**
   * Returns a normalized type of given item.
   */
  static getType(item: unknown): string {
    const type = typeof item
    if (type !== 'object') {
      return type
    }
    if (item === null) {
      return 'null'
    }
    if (Array.isArray(item)) {
      return 'array'
    }
    return 'object'
  }

  static createKey(index: number): string {
    return String(index).padStart(8, '0')
  }

  static deepEqual(current: unknown, next: unknown): boolean {
    if (Object.is(current, next)) {
      return true
    }
    const type = this.getType(current)
    const nextType = this.getType(next)
    if (type !== nextType) {
      return false
    }
    if (type === 'array') {
      const currentArray = current as unknown[]
      const nextArray = next as unknown[]
      if (currentArray.length !== nextArray.length) {
        return false
      }
      for (let i = 0; i < currentArray.length; i++) {
        const equal = this.deepEqual(currentArray[i], nextArray[i])
        if (!equal) {
          return false
        }
      }
      return true
    } else if (type === 'object') {
      const currentObject = current as Record<string, unknown>
      const nextObject = next as Record<string, unknown>
      if (currentObject.constructor !== nextObject.constructor) {
        return false
      }
      // these keep their values in internal slots, not in own keys
      if (current instanceof Date) {
        return Object.is(current.getTime(), (next as Date).getTime())
      }
      if (current instanceof Map || current instanceof Set) {
        return this.deepEqual([...current], [...(next as typeof current)])
      }
      const keys = Object.keys(currentObject)
      const nextKeys = Object.keys(nextObject)
      if (keys.length !== nextKeys.length) {
        return false
      }
      keys.sort()
      nextKeys.sort()
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        if (key !== nextKeys[i]) {
          return false
        }
        const equal = this.deepEqual(currentObject[key!], nextObject[key!])
        if (!equal) {
          return false
        }
      }
      return true
    }
    return false
  }
}

export default Diff
