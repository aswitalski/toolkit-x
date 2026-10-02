import type { ComponentDescription, NodeDescription } from './description.js'
import {
  Comment,
  type Component,
  type ParentVirtualNode,
  Text,
  VirtualElement,
  type VirtualNode,
  WebComponent,
} from './nodes.js'

const VirtualDOM = {
  /**
   * Creates a new Virtual DOM structure from given description.
   */
  createFromDescription(
    description: NodeDescription | null,
    parent?: VirtualNode | null,
    context?: WebComponent | null,
  ): VirtualNode | null {
    if (!description) {
      return null
    }
    switch (description.type) {
      case 'component':
        return this.createComponent(description, parent, context)
      case 'element': {
        const element = new VirtualElement(description, parent, context)
        this.createChildNodes(element)
        return element
      }
      case 'comment':
        return new Comment(description, parent!)
      case 'text':
        return new Text(description, parent!)
      default:
        throw new Error(
          `Unsupported node type: ${(description as NodeDescription).type}`,
        )
    }
  },

  /**
   * Creates the child nodes of an element or a Web Component.
   */
  createChildNodes(parent: ParentVirtualNode) {
    const { children } = parent.description
    if (children) {
      parent.setChildNodes(
        children.map(description =>
          this.createFromDescription(description, parent, parent.context)!,
        ),
      )
    }
  },

  /**
   * Creates a new component instance from given description.
   */
  createComponent(
    description: ComponentDescription,
    parent?: VirtualNode | null,
    context?: WebComponent | null,
  ): Component {
    const ComponentClass = description.component
    if (ComponentClass.prototype instanceof WebComponent) {
      return this.createWebComponent(
        description,
        parent && parent.rootNode,
        context,
        /*= requireCustomElement */ true,
      )
    }
    const component = new ComponentClass(description, parent, context)
    const nodeDescription = component.renderDescription(
      description.props,
      description.childrenAsTemplates,
    )
    component.content = this.createFromDescription(
      nodeDescription,
      component,
      context,
    )
    return component
  },

  /**
   * Creates a new Web Component instance from given description.
   */
  createWebComponent(
    description: ComponentDescription,
    parent?: VirtualNode | null,
    context?: WebComponent | null,
    requireCustomElement = false,
  ): WebComponent {
    try {
      const ComponentClass = description.component as typeof WebComponent
      if (requireCustomElement && !ComponentClass.elementName) {
        throw new Error(
          `Root component "${
            ComponentClass.displayName
          }" does not define custom element name!`,
        )
      }
      const root = new ComponentClass(description, parent, context)
      if (ComponentClass.elementName) {
        // rendered in the light DOM of the custom element
        this.createChildNodes(root)
      }
      return root
    } catch (error) {
      console.error('Error rendering root component:', description)
      throw error
    }
  },
}

export default VirtualDOM
