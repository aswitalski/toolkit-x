/* Helpers and types for inspecting virtual DOM nodes in the tests. */
import {
  Component,
  Template,
  type VirtualElement,
  type VirtualNode,
  VirtualDOM,
  WebComponent,
} from '../src/index.js'
import type {
  ComponentDescription,
  ElementDescription,
  NodeDescription,
  TextDescription,
} from '../src/core/description.js'

type TestTemplate = Parameters<typeof Template.describe>[0]

/*
 * A node description as inspected by the tests,
 * with the properties of all description types.
 */
export type AnyDescription = NodeDescription &
  Required<
    Omit<ElementDescription, 'type' | 'children'> &
      Omit<ComponentDescription, 'type' | 'children'> &
      Omit<TextDescription, 'type' | 'children'>
  > & {
    type: NodeDescription['type']
    children: AnyDescription[]
  }

type LooseNodeProperty =
  | 'description'
  | 'children'
  | 'content'
  | 'ref'
  | 'parentNode'
  | 'childElement'
  | 'placeholder'
  | 'container'

/*
 * A virtual node as inspected by the tests,
 * with the properties of all node types.
 */
export type AnyNode = VirtualNode &
  Omit<VirtualElement & WebComponent, LooseNodeProperty> & {
    description: AnyDescription
    children: AnyNode[]
    content: AnyNode
    ref: HTMLElement
    parentNode: AnyNode
    childElement: AnyNode
    placeholder: AnyNode
    container: Element
  }

/* A virtual element as inspected by the tests. */
export type AnyElement = VirtualElement & AnyNode

/* A component or a Web Component as inspected by the tests. */
export type AnyComponent = WebComponent & AnyNode

const container = document.createElement('main')

export const createFromTemplate = <T = AnyNode>(
  template: TestTemplate,
  parent?: VirtualNode | null,
) => VirtualDOM.createFromDescription(Template.describe(template), parent) as T

export const createRootInstance = <T extends WebComponent>(
  RootClass: abstract new (...args: never[]) => T,
) => {
  const description = Template.describe([RootClass]) as ComponentDescription
  const root = VirtualDOM.createWebComponent(description, null, null, false)
  root.container = container
  return root as T
}

export const createWebComponent = async <T extends WebComponent>(
  RootClass: abstract new (...args: never[]) => T,
) => {
  const instance = createRootInstance(RootClass)
  await instance.init()
  return instance
}

export const createRoot = (template: TestTemplate = null) => {
  class Root extends WebComponent {
    render() {
      return template as never
    }
  }
  const root = createRootInstance(Root)
  root.container = document.createElement('main')
  const node = VirtualDOM.createFromDescription(Template.describe(template))
  if (node) {
    // inserted as a light DOM child node
    root.insertChild(node)
  }
  return root
}

export const createComponent = <T = AnyNode>(template: TestTemplate = null) => {
  class TestComponent extends Component {
    render() {
      return template as never
    }
  }
  return createFromTemplate<T>([TestComponent])
}
