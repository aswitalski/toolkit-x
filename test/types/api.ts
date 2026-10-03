/*
 * Type tests of the public API, checked by `npm run typecheck`.
 * Each @ts-expect-error marks a mistake the types must reject.
 */
import toolkit, {
  type CommandsAPI,
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
  push(item: number) {
    this.items.push(item)
  },
} satisfies CommandsAPI<StackState>

const OtherCommands = {
  rename(name: string) {
    this.name = name
  },
} satisfies CommandsAPI<{ name: string }>

// @ts-expect-error commands change the state of the component
class Other extends WebComponent<object, StackState, typeof OtherCommands> {}
void [Other, OtherCommands]

const InvalidCommands = {
  push(item: number) {
    // @ts-expect-error commands change the state they are typed with
    this.missing = item
  },
} satisfies CommandsAPI<StackState>
void InvalidCommands

class Stack extends WebComponent<
  { initial: number[] },
  StackState,
  typeof StackCommands
> {
  static elementName = 'type-test-stack'

  static styles = ['styles/stack.css']

  static commands = StackCommands

  getInitialState(props: { initial: number[] }): StackState {
    return { items: props.initial }
  }

  onAttached() {
    void (this.commands.push(1) satisfies Promise<boolean>)
    void this.commands.update({ items: [] })
    // @ts-expect-error commands take the arguments of the API
    void this.commands.push('1')
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

// The Toolkit instance exposes the classes and helpers, not the internals

export class SomeService extends toolkit.Service {
  static events = ['change']
}
export const throttled = toolkit.utils.throttle(() => {}, 100)
export const classes = [toolkit.Component, toolkit.WebComponent]

// @ts-expect-error internal modules
export const templateModule = toolkit.Template

// @ts-expect-error internal modules
export const diffModule = toolkit.Diff

// @ts-expect-error internal helpers
export const attributeName = toolkit.utils.getAttributeName

// The attribute and listener names are those of Chromium, in camel case

export const domNames: Template[] = [
  ['div', { popover: 'auto', inert: true }],
  ['img', { loading: 'lazy', fetchPriority: 'high' }],
  ['label', { for: 'name' }],
  ['div', { ariaDescription: 'text', ariaControls: 'id', role: 'button' }],
]

// the camel case names supported before are still accepted
export const camelCaseNames: Template[] = [
  ['input', { autoComplete: 'off', spellCheck: true, onChange: () => {} }],
  ['img', { srcSet: 'image.png 2x', onDoubleClick: () => {} }],
  ['div', { ariaLabelLedBy: 'id' }],
]

// the events and attributes of Chromium, also in camel case
export const chromiumNames: Template[] = [
  ['div', { onPointerDown: (event: PointerEvent) => event.pointerId }],
  ['input', { onBeforeInput: (event: InputEvent) => event.data }],
  ['div', { onBeforeXRSelect: () => {}, onBeforeMatch: () => {} }],
  ['div', { onScrollSnapChange: () => {} }],
  ['input', { webkitDirectory: true, virtualKeyboardPolicy: 'manual' }],
  ['img', { attributionSrc: '', lowSrc: 'low.png' }],
  ['input', { autoCorrect: 'on' }],
]

// the filter and transform functions, in camel case
export const functions: Template[] = [
  ['div', { style: { filter: { dropShadow: '2px 2px', hueRotate: 90 } } }],
  ['div', { style: { filter: { url: '#filter', blur: '4px' } } }],
  [
    'div',
    { style: { transform: { translateX: '10px', rotate3d: '1,1,1,5deg' } } },
  ],
]

// @ts-expect-error unknown filter functions
export const glow: Template = ['div', { style: { filter: { glow: 1 } } }]

// @ts-expect-error filter functions named in kebab case
export const dash: Template = ['p', { style: { filter: { 'hue-rotate': 9 } } }]

// @ts-expect-error obsolete attributes
export const obsoleteAttribute: Template = ['div', { contextMenu: 'menu' }]

// @ts-expect-error attributes named in lower case
export const lowerCaseAttribute: Template = ['input', { autocomplete: 'on' }]

// @ts-expect-error the DOM name of the for attribute
export const domName: Template = ['label', { htmlFor: 'name' }]

// @ts-expect-error listeners named in lower case
export const lowerCase: Template = ['div', { onclick: () => {} }]

// @ts-expect-error removed events
export const removedEvent: Template = ['div', { onDragExit: () => {} }]

// @ts-expect-error properties not reflecting attributes
export const content: Template = ['div', { innerHTML: '<b>bold</b>' }]

// @ts-expect-error read-only properties
export const readOnly: Template = ['div', { clientWidth: 100 }]
