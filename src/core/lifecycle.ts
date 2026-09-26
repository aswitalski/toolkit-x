import type {
  ComponentDescription,
  NodeDescription,
  Props,
} from './description.js'
import type {
  Component,
  VirtualElement,
  VirtualNode,
  WebComponent,
} from './nodes.js'
import Patch from './patch.js'

const Lifecycle = {
  onComponentCreated(component: Component) {
    if (component.hasOwnMethod('onCreated')) {
      component.dispatcher.queueIncoming()
      component.onCreated!.call(component.sandbox)
      component.dispatcher.executeIncoming()
    }
    if (component.content) {
      this.onNodeCreated(component.content)
    }
  },

  onElementCreated(element: VirtualElement | WebComponent) {
    if (element.children) {
      for (const child of element.children) {
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
      root.dispatcher.queueIncoming()
      root.onCreated!.call(root.sandbox)
      root.dispatcher.executeIncoming()
    }
    if (root.children) {
      for (const child of root.children) {
        this.onNodeCreated(child)
      }
    }
  },

  onComponentAttached(component: Component) {
    if (component.content) {
      this.onNodeAttached(component.content)
    }
    if (component.hasOwnMethod('onAttached')) {
      component.dispatcher.queueIncoming()
      component.onAttached!.call(component.sandbox)
      component.dispatcher.executeIncoming()
    }
  },

  onElementAttached(element: VirtualElement | WebComponent) {
    if (element.children) {
      for (const child of element.children) {
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
    if (root.children) {
      for (const child of root.children) {
        this.onNodeAttached(child)
      }
    }
    if (root.hasOwnMethod('onAttached')) {
      root.onAttached!.call(root.sandbox)
    }
  },

  onComponentReceivedProps(component: Component, nextProps: Props = {}) {
    if (component.hasOwnMethod('onPropsReceived')) {
      component.dispatcher.queueIncoming()
      component.onPropsReceived!.call(component.sandbox, nextProps)
      component.dispatcher.executeIncoming()
    }
  },

  onComponentUpdated(component: Component, prevProps: Props = {}) {
    if (component.hasOwnMethod('onUpdated')) {
      component.dispatcher.queueIncoming()
      component.onUpdated!.call(component.sandbox, prevProps)
      component.dispatcher.executeIncoming()
    }
  },

  onComponentDestroyed(component: Component) {
    component.destroy()
    if (component.hasOwnMethod('onDestroyed')) {
      component.dispatcher.ignoreIncoming()
      component.onDestroyed!.call(component.sandbox)
    }
    if (component.content) {
      this.onNodeDestroyed(component.content)
    }
    if (component.isRoot()) {
      this.onElementDestroyed(component)
    }
  },

  onElementDestroyed(element: VirtualElement | WebComponent) {
    if (element.children) {
      for (const child of element.children) {
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
      component.dispatcher.ignoreIncoming()
      component.onDetached!.call(component.sandbox)
    }
  },

  onElementDetached(element: VirtualElement | WebComponent) {
    if (element.children) {
      for (const child of element.children) {
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
