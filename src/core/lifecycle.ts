import type {
  ComponentDescription,
  NodeDescription,
  Props,
} from './description.js'
import type {
  Component,
  ParentVirtualNode,
  VirtualNode,
  WebComponent,
} from './nodes.js'
import Patch from './patch.js'

/* The errors of the hooks called while collecting them, if collecting. */
let hookErrors: unknown[] | null = null

/*
 * Calls a hook, collecting its error if collecting, so that a throwing hook
 * does not stop the other hooks from being called.
 */
const callHook = (hook: () => void) => {
  if (!hookErrors) {
    return hook()
  }
  try {
    hook()
  } catch (error) {
    hookErrors.push(error)
  }
}

/*
 * Calls the hook of a component being removed, ignoring the commands it
 * issues. The dispatcher is shared with the root, so its mode is restored.
 */
const callIgnoringCommands = (component: Component, hook: () => void) => {
  const { dispatcher } = component
  const { mode } = dispatcher
  dispatcher.ignoreIncoming()
  try {
    callHook(hook)
  } finally {
    dispatcher.mode = mode
  }
}

/* Throws the errors, aggregated when there are more of them. */
export const throwErrors = (errors: unknown[], message: string) => {
  if (errors.length === 1) {
    throw errors[0]
  }
  if (errors.length > 1) {
    throw new AggregateError(errors, message)
  }
}

const Lifecycle = {
  /**
   * Calls the hooks in the callback, collecting the errors they throw in
   * the given list instead of stopping at the first one.
   */
  collectingErrors(errors: unknown[], callback: () => void) {
    const prevErrors = hookErrors
    hookErrors = errors
    try {
      callback()
    } finally {
      hookErrors = prevErrors
    }
  },

  onComponentCreated(component: Component) {
    if (component.hasOwnMethod('onCreated')) {
      callHook(() => component.onCreated!.call(component.sandbox))
    }
    if (component.content) {
      this.onNodeCreated(component.content)
    }
  },

  onElementCreated(element: ParentVirtualNode) {
    if (element.childNodes) {
      for (const child of element.childNodes) {
        this.onNodeCreated(child)
      }
    }
  },

  onNodeCreated(node: VirtualNode): void {
    if (node.isElement()) {
      return this.onElementCreated(node)
    } else if (node.isComponent() && !node.isRoot()) {
      return this.onComponentCreated(node)
    }
  },

  onRootCreated(root: WebComponent) {
    if (root.hasOwnMethod('onCreated')) {
      callHook(() => root.onCreated!.call(root.sandbox))
    }
    const { childNodes } = root
    if (childNodes) {
      for (const child of childNodes) {
        this.onNodeCreated(child)
      }
    }
  },

  onComponentAttached(component: Component) {
    if (component.content) {
      this.onNodeAttached(component.content)
    }
    if (component.hasOwnMethod('onAttached')) {
      callHook(() => component.onAttached!.call(component.sandbox))
    }
  },

  onElementAttached(element: ParentVirtualNode) {
    if (element.childNodes) {
      for (const child of element.childNodes) {
        this.onNodeAttached(child)
      }
    }
  },

  onNodeAttached(node: VirtualNode): void {
    if (node.isElement()) {
      return this.onElementAttached(node)
    } else if (node.isComponent() && !node.isRoot()) {
      return this.onComponentAttached(node)
    }
  },

  onNodeReceivedDescription(node: VirtualNode, description: NodeDescription) {
    if (node.isComponent()) {
      this.onComponentReceivedProps(
        node,
        (description as ComponentDescription).props,
      )
    }
  },

  onNodeUpdated(node: VirtualNode, prevDescription: NodeDescription) {
    if (node.isComponent()) {
      this.onComponentUpdated(
        node,
        (prevDescription as ComponentDescription).props,
      )
    }
  },

  onRootAttached(root: WebComponent) {
    const { childNodes } = root
    if (childNodes) {
      for (const child of childNodes) {
        this.onNodeAttached(child)
      }
    }
    if (root.hasOwnMethod('onAttached')) {
      callHook(() => root.onAttached!.call(root.sandbox))
    }
  },

  onComponentReceivedProps(component: Component, nextProps: Props = {}) {
    if (component.hasOwnMethod('onPropsReceived')) {
      callHook(() =>
        component.onPropsReceived!.call(component.sandbox, nextProps),
      )
    }
  },

  onComponentUpdated(component: Component, prevProps: Props = {}) {
    if (component.hasOwnMethod('onUpdated')) {
      callHook(() => component.onUpdated!.call(component.sandbox, prevProps))
    }
  },

  onComponentDestroyed(component: Component) {
    component.destroy()
    if (component.hasOwnMethod('onDestroyed')) {
      callIgnoringCommands(component, () =>
        component.onDestroyed!.call(component.sandbox),
      )
    }
    if (component.content) {
      this.onNodeDestroyed(component.content)
    }
    if (component.isRoot()) {
      this.onElementDestroyed(component)
    }
  },

  onElementDestroyed(element: ParentVirtualNode) {
    if (element.childNodes) {
      for (const child of element.childNodes) {
        this.onNodeDestroyed(child)
      }
    }
  },

  onNodeDestroyed(node: VirtualNode): void {
    if (node.isElement()) {
      return this.onElementDestroyed(node)
    } else if (node.isComponent() && !node.isRoot()) {
      return this.onComponentDestroyed(node)
    }
  },

  onComponentDetached(component: Component) {
    if (component.isRoot()) {
      this.onElementDetached(component)
    }
    if (component.content) {
      this.onNodeDetached(component.content)
    }
    if (component.hasOwnMethod('onDetached')) {
      callIgnoringCommands(component, () =>
        component.onDetached!.call(component.sandbox),
      )
    }
  },

  onElementDetached(element: ParentVirtualNode) {
    if (element.childNodes) {
      for (const child of element.childNodes) {
        this.onNodeDetached(child)
      }
    }
  },

  onNodeDetached(node: VirtualNode) {
    if (node.isElement()) {
      this.onElementDetached(node)
      node.parentNode = null
    } else if (node.isComponent() && !node.isRoot()) {
      this.onComponentDetached(node)
      node.parentNode = null
    }
  },

  beforeUpdate(patches: Patch[]) {
    for (const patch of patches) {
      this.beforePatchApplied(patch)
    }
  },

  beforePatchApplied(patch: Patch) {
    const Type = Patch.Type
    switch (patch.type) {
      case Type.INIT_ROOT_COMPONENT:
        this.onRootCreated(patch.root)
        return
      case Type.INSERT_CHILD:
        this.onNodeCreated(patch.node)
        return
      case Type.REPLACE_CHILD:
      case Type.SET_CONTENT:
        this.onNodeDestroyed(patch.child)
        this.onNodeCreated(patch.node)
        return
      case Type.REMOVE_CHILD:
        this.onNodeDestroyed(patch.child)
        return
      case Type.UPDATE_NODE:
        this.onNodeReceivedDescription(patch.node, patch.description)
        return
    }
  },

  afterUpdate(patches: Patch[]) {
    patches = [...patches].reverse()
    for (const patch of patches) {
      this.afterPatchApplied(patch)
    }
  },

  afterPatchApplied(patch: Patch) {
    const Type = Patch.Type
    switch (patch.type) {
      case Type.INIT_ROOT_COMPONENT:
        this.onRootAttached(patch.root)
        return
      case Type.INSERT_CHILD:
        this.onNodeAttached(patch.node)
        return
      case Type.REPLACE_CHILD:
      case Type.SET_CONTENT:
        this.onNodeDetached(patch.child)
        this.onNodeAttached(patch.node)
        return
      case Type.REMOVE_CHILD:
        this.onNodeDetached(patch.child)
        return
      case Type.UPDATE_NODE:
        this.onNodeUpdated(patch.node, patch.prevDescription)
        return
    }
  },
}

export default Lifecycle
