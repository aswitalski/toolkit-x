import type { ComponentDescription, NodeDescription } from './description.js'
import {
  Comment,
  type Component,
  Text,
  VirtualElement,
  type VirtualNode,
  WebComponent,
} from './nodes.js'
import Renderer from './renderer.js'

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
      case 'element':
        return new VirtualElement(description, parent, context)
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
    const nodeDescription = Renderer.render(
      component,
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
      return new ComponentClass(description, parent, context)
    } catch (error) {
      console.error('Error rendering root component:', description)
      throw error
    }
  },
}

export default VirtualDOM
