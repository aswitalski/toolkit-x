import { Component, Root, WebComponent } from './core/nodes.js'
import Service from './core/service.js'
import Toolkit, { toolkit } from './core/toolkit.js'
import utils from './core/utils.js'

/* The classes and helpers available on the Toolkit instance. */
type ToolkitClasses = {
  Component: typeof Component
  WebComponent: typeof WebComponent
  Root: typeof Root
  Service: typeof Service
  utils: typeof utils
  noop: () => void
}

const classes: ToolkitClasses = {
  Component,
  WebComponent,
  Root,
  Service,
  utils,
  noop: () => {},
}

Object.assign(Toolkit.prototype, classes)

export type {
  AttributeValue,
  Child,
  ClassName,
  ComponentTemplate,
  ComponentType,
  ElementProps,
  ElementTemplate,
  EventListenerFor,
  Listener,
  PureComponent,
  RenderResult,
  Style,
  TagName,
  Template,
} from './core/bragi.js'
export type { AttributeName, EventName } from './core/browser.js'
export type { Props } from './core/description.js'
export type {
  BoundCommands,
  CommandMethod,
  Commands,
  CommandsAPI,
  State,
} from './core/dispatcher.js'
export type { ComponentClass, Connectable } from './core/nodes.js'
export type { PluginManifest, PluginSandbox } from './core/plugins.js'
export type { Update } from './core/renderer.js'
export type { Options, Settings } from './core/toolkit.js'

export { Component, Root, Service, WebComponent, utils }

/* The Toolkit instance, with the classes and helpers assigned above. */
export type ToolkitAPI = Toolkit & ToolkitClasses

export default toolkit as ToolkitAPI
