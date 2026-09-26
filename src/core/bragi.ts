/*
 * Types of Bragi templates, describing the rendered content with arrays,
 * objects and primitive values.
 */
import type {
  AttributeName,
  EventName,
  FilterName,
  TransformName,
} from './browser.js'
import type { Props } from './description.js'
import type { Component } from './nodes.js'

/* A value of an attribute, a data attribute or a function list entry. */
export type AttributeValue =
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | ReadonlyArray<string | number>

/* Class names as a string, a list or an object of conditionally set names. */
export type ClassName =
  | string
  | false
  | null
  | undefined
  | readonly ClassName[]
  | { readonly [name: string]: unknown }

export type StyleValue =
  string | number | boolean | null | undefined | ReadonlyArray<string | number>

/* Functions of the filter and transform style properties, e.g. { blur: 2 }. */
export type FunctionList<Name extends string> = {
  readonly [F in Name]?: AttributeValue
}

type CSSPropertyName = {
  [K in keyof CSSStyleDeclaration]: K extends string
    ? CSSStyleDeclaration[K] extends string
      ? K
      : never
    : never
}[keyof CSSStyleDeclaration]

export type Style = {
  readonly [P in Exclude<CSSPropertyName, 'filter' | 'transform'>]?: StyleValue
} & {
  readonly [P in `--${string}`]?: StyleValue
} & {
  readonly filter?: StyleValue | FunctionList<FilterName>
  readonly transform?: StyleValue | FunctionList<TransformName>
}

/* The DOM event name for a listener name, as resolved by the renderer. */
type DOMEventName<N extends string> = N extends 'onDoubleClick'
  ? 'dblclick'
  : N extends `on${infer E}`
    ? Lowercase<E>
    : never

export type Listener<E extends Event = Event> = (event: E) => unknown

export type EventListenerFor<N extends EventName> = Listener<
  DOMEventName<N> extends keyof HTMLElementEventMap
    ? HTMLElementEventMap[DOMEventName<N>]
    : Event
>

type SpecialProps = {
  readonly key?: string | number
  readonly class?: ClassName
  readonly style?: Style
  readonly dataset?: { readonly [name: string]: AttributeValue }
  readonly properties?: { readonly [name: string]: unknown }
  readonly attrs?: { readonly [name: string]: AttributeValue }
  readonly on?: {
    readonly [event: string]: Listener | null | false | undefined
  }
}

type AttributeProps = {
  readonly [A in Exclude<AttributeName, keyof SpecialProps>]?: AttributeValue
}

type ListenerProps = {
  readonly [E in EventName]?: EventListenerFor<E> | null | false | undefined
}

/* Props of an element: attributes, listeners and the special props. */
export type ElementProps = SpecialProps & AttributeProps & ListenerProps

/* Tag names, with suggestions for the known HTML elements. */
export type TagName = keyof HTMLElementTagNameMap | (string & {})

/* A child node: a nested template, text or a skipped null or false. */
export type Child = Template | string | number | true | null | false

export type ElementTemplate =
  readonly [TagName, ...Child[]] | readonly [TagName, ElementProps, ...Child[]]

/* A function rendering the template for given props. */
export type PureComponent = (props: never) => RenderResult

/* A component class, a pure component, or a module loader symbol. */
export type ComponentType = typeof Component<object> | PureComponent | symbol

export type ComponentTemplate =
  | readonly [ComponentType, ...Child[]]
  | readonly [ComponentType, Props, ...Child[]]

/*
 * Component templates come first, so that type errors in element templates
 * are reported against the element props.
 */
export type Template = ComponentTemplate | ElementTemplate | null | false

/* The result of a render method, nothing rendered when falsy. */
export type RenderResult = Template | undefined
