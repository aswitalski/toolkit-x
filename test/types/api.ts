/*
 * Type tests of the public API, checked by `npm run typecheck`.
 * Each @ts-expect-error marks a mistake the types must reject.
 */
import toolkit, {
  Component,
  type Template,
  WebComponent,
} from '../../src/index.js'

// Element templates

export const elements: Template[] = [
  ['section', { class: 'rectangle', style: { height: [120, 'px'] } }],
  [
    'a',
    { class: ['link', { highlighted: true }], href: 'https://www.opera.com' },
    'Opera',
  ],
  ['ul', ['li', 'First item'], ['li', 'Second item']],
  ['div', null, false, 42, true, 'text'],
  ['custom-element', { attrs: { level: 1 }, on: { change: () => {} } }],
  ['div', { style: { '--gap': [4, 'px'], filter: { blur: [2, 'px'] } } }],
  ['div', { dataset: { id: 7 }, properties: { value: {} } }],
  ['button', { onClick: event => event.clientX }],
  ['input', { onKeyDown: event => event.key }],
  null,
  false,
]

// @ts-expect-error misspelled class prop
export const misspelled: Template = ['div', { clas: 'box' }]

// @ts-expect-error unknown style property
export const unknownStyle: Template = ['div', { style: { colour: 'red' } }]

// @ts-expect-error function list outside of filter and transform
export const functionList: Template = ['div', { style: { color: { a: 1 } } }]

// @ts-expect-error listeners receive the matching event type
export const listener: Template = ['div', { onClick: (e: KeyboardEvent) => e }]

// @ts-expect-error undefined children throw when rendered
export const undefinedChild: Template = ['div', undefined]

// Components

class Title extends Component<{ text: string }> {
  render(): Template {
    return ['h1', this.props.text]
  }
}

class Misspelled extends Component<{ text: string }> {
  render(): Template {
    // @ts-expect-error props are typed
    return ['h1', this.props.txt]
  }
}

const Square = (props: { size: number }): Template => [
  'section',
  { style: { width: [props.size, 'px'], height: [props.size, 'px'] } },
]

class Card extends Component<{ title: string }> {
  render(): Template {
    return ['section', ['h2', this.props.title], ...this.children]
  }
}

class FirstChild extends Component {
  render(): Template {
    // @ts-expect-error children can be text, which is not a template
    return this.children[0] ?? null
  }
}

export const components: Template[] = [
  [Card, { title: 'Card' }, ['p', 'content'], 'text'],
  [Title, { text: 'Hello' }],
  [Square, { size: 4 }],
  [Title, ['span', 'child']],
]

// Web components with state and commands

interface StackState {
  items: number[]
}

const StackCommands = {
  push: (item: number) => (state: StackState) => ({
    items: [...state.items, item],
  }),
}

class Stack extends WebComponent<
  { initial: number[] },
  StackState,
  typeof StackCommands
> {
  static elementName = 'type-test-stack'

  static styles = ['styles/stack.css']

  static getCommands() {
    return StackCommands
  }

  getInitialState(props: { initial: number[] }): StackState {
    return { items: props.initial }
  }

  onAttached() {
    this.commands.push(1)
    this.commands.update({ items: [] })
    // @ts-expect-error commands take the arguments of the API
    this.commands.push('1')
    // @ts-expect-error unknown commands
    this.commands.pop()
  }

  render(): Template {
    return ['ul', ...this.props.items.map(item => ['li', item] as const)]
  }
}

export const render = (container: Element) =>
  toolkit.render(Stack, container, { initial: [1, 2, 3] })

export { FirstChild, Misspelled }

// The Toolkit instance exposes the modules

export const description = toolkit.Template.describe(['div', 'text'])

// @ts-expect-error unknown modules
export const unknownModule = toolkit.Templates
