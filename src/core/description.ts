import { type ComponentClass, Root } from './nodes.js'

export type Props = Record<string, unknown>

/* An event listener, possibly bound to a component by its sandbox. */
export type Listener = ((event: Event) => unknown) & { source?: unknown }

export type NodeDescription =
  | ComponentDescription
  | ElementDescription
  | CommentDescription
  | TextDescription

/* A normalized template, as returned by the asTemplate getters. */
export type NormalizedTemplate = unknown[] | string | null

/*
 * Normalized description of a template.
 * Is used to calculate differences between nodes.
 */
abstract class Description {
  declare static ElementDescription: typeof ElementDescription
  declare static ComponentDescription: typeof ComponentDescription
  declare static CommentDescription: typeof CommentDescription
  declare static TextDescription: typeof TextDescription

  declare key?: string
  declare children?: NodeDescription[]

  abstract get asTemplate(): NormalizedTemplate

  get childrenAsTemplates(): NormalizedTemplate[] | undefined {
    if (this.children) {
      return this.children.map(child => child.asTemplate)
    }
    return undefined
  }

  isCompatible(description: Description): boolean {
    return this.constructor === description.constructor
  }
}

/*
 * Defines a normalized description of a component.
 *
 * Enumerable properties:
 * - key (a unique node identifier within its parent),
 * - component (an object with meta information)
 * - children (an array of child nodes)
 * - props (an object of any component rendering props)
 *
 * Non-enumerable properties:
 * - asTemplate: returns component description as a normalized template
 */
class ComponentDescription extends Description {
  declare component: ComponentClass
  declare type: 'component'
  declare props?: Props
  declare attrs?: Record<string, string>

  constructor(component: ComponentClass) {
    super()
    this.component = component
    this.type = 'component'
  }

  isCompatible(description: Description): boolean {
    return (
      super.isCompatible(description) &&
      this.component === (description as ComponentDescription).component
    )
  }

  get isRoot(): boolean {
    return this.component.prototype instanceof Root
  }

  get asTemplate(): unknown[] {
    const template: unknown[] = [this.component]
    if (this.props) {
      template.push(this.props)
    }
    if (this.children) {
      template.push(...this.children.map(child => child.asTemplate))
    }
    return template
  }
}

/*
 * Defines a normalized description of an element.
 *
 * Enumerable properties:
 * - key (a unique node identifier within its parent),
 * - name (a string representing tag name),
 * - children (an array of child nodes),
 * - props (an object) defining:
 *    - class (a class name string)
 *    - style (an object for style property to string value mapping)
 *    - listeners (an object for event name to listener mapping)
 *    - attrs (an object for normalized attribute name to value mapping)
 *    - dataset (an object representing data attributes)
 *    - properties (an object for properties set directly on DOM element)
 *
 * Non-enumerable properties:
 * - asTemplate: returns element description as a normalized template
 */
class ElementDescription extends Description {
  declare name: string
  declare type: 'element'
  declare class?: string
  declare style?: Record<string, string>
  declare attrs?: Record<string, string>
  declare dataset?: Record<string, string>
  declare listeners?: Record<string, Listener>
  declare properties?: Record<string, unknown>
  declare custom?: {
    attrs?: Record<string, string>
    listeners?: Record<string, Listener>
  }

  constructor(name: string) {
    super()
    this.name = name
    this.type = 'element'
  }

  isCompatible(description: Description): boolean {
    return (
      super.isCompatible(description) &&
      this.name === (description as ElementDescription).name
    )
  }

  get asTemplate(): unknown[] {
    const template: unknown[] = [this.name]
    const props: Record<string, unknown> = {}
    if (this.key) {
      props.key = this.key
    }
    if (this.class) {
      props.class = this.class
    }
    if (this.style) {
      props.style = this.style
    }
    if (this.attrs) {
      Object.assign(props, this.attrs)
    }
    if (this.dataset) {
      props.dataset = this.dataset
    }
    if (this.listeners) {
      Object.assign(props, this.listeners)
    }
    if (this.properties) {
      props.properties = this.properties
    }
    if (this.custom?.attrs) {
      props.attrs = this.custom.attrs
    }
    if (this.custom?.listeners) {
      props.on = this.custom.listeners
    }
    if (Object.keys(props).length) {
      template.push(props)
    }
    if (this.children) {
      template.push(...this.children.map(child => child.asTemplate))
    }
    return template
  }
}

/*
 * Description of a Comment node.
 */
class CommentDescription extends Description {
  declare text: string
  declare type: 'comment'

  constructor(text: string) {
    super()
    this.text = text
    this.type = 'comment'
  }

  get asTemplate(): null {
    return null
  }

  isCompatible(description: Description): boolean {
    return (
      super.isCompatible(description) &&
      this.text === (description as CommentDescription).text
    )
  }
}

/*
 * Description of a Text node.
 */
class TextDescription extends Description {
  declare text: string
  declare type: 'text'

  constructor(text: string) {
    super()
    this.text = text
    this.type = 'text'
  }

  get asTemplate(): string {
    return this.text
  }

  isCompatible(description: Description): boolean {
    return (
      super.isCompatible(description) &&
      this.text === (description as TextDescription).text
    )
  }
}

Object.assign(Description, {
  ElementDescription,
  ComponentDescription,
  CommentDescription,
  TextDescription,
})

export {
  ElementDescription,
  ComponentDescription,
  CommentDescription,
  TextDescription,
}

export default Description
