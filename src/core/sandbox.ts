import type { Props } from './description.js'
import { Component, type WebComponent } from './nodes.js'
import type { AnyFunction } from './utils.js'

/*
 * The component proxy passed as `this` to render and lifecycle methods,
 * exposing props and children and binding the component methods.
 */
export type ComponentSandbox = Omit<Component, 'children'> & {
  props: Props
  children: unknown[]
}

type BoundListener = AnyFunction & { source?: unknown; component?: Component }

/* Reads a property as `target[property]` does. */
const get = (target: object, property: PropertyKey): unknown =>
  Reflect.get(target, property)

const isFunction = (target: object, property: PropertyKey) =>
  typeof get(target, property) === 'function'

const delegated: PropertyKey[] = [
  'commands',
  'constructor',
  'container',
  'elementName',
]
const methods: PropertyKey[] = ['connectTo']
const pluginMethods: PropertyKey[] = []

const createBoundListener = (
  listener: AnyFunction,
  component: Component,
  context: unknown,
) => {
  const boundListener: BoundListener = listener.bind(context)
  boundListener.source = listener
  boundListener.component = component
  return boundListener
}

class Sandbox {
  static registerPluginMethod(name: string) {
    pluginMethods.push(name)
  }

  static create(component: Component): ComponentSandbox {
    const blacklist: PropertyKey[] = Object.getOwnPropertyNames(
      Component.prototype,
    )
    const state: { props?: Props; children?: unknown[] } = {}
    const autobound: Record<PropertyKey, BoundListener> = {}
    return new Proxy(component, {
      get: (target, property, receiver) => {
        if (property === 'props') {
          return state.props || (target as WebComponent).state || {}
        }
        if (property === 'children') {
          return state.children || []
        }
        if (property === 'host') {
          return target.isRoot() ? target.shadow!.host : null
        }
        if (property === 'ref') {
          if (target.isRoot()) {
            // returns rendered node instead of custom element for usage of
            // this.ref.querySelector
            return target.content!.ref
          }
          return target.ref
        }
        if (property === '$component') {
          return component
        }
        if (delegated.includes(property)) {
          return get(target, property)
        }
        if (methods.includes(property) && isFunction(target, property)) {
          return createBoundListener(
            get(target, property) as AnyFunction,
            target,
            target,
          )
        }
        if (pluginMethods.includes(property)) {
          return get(target.rootNode, property)
        }
        if (blacklist.includes(property)) {
          return undefined
        }
        if (isFunction(autobound, property)) {
          return autobound[property]
        }
        if (isFunction(target, property)) {
          return (autobound[property] = createBoundListener(
            get(target, property) as AnyFunction,
            target,
            receiver,
          ))
        }
        return get(target, property)
      },
      set: (target, property, value) => {
        if (property === 'props') {
          state.props = value as Props
          return true
        }
        if (property === 'children') {
          state.children = (value as unknown[]) || []
          return true
        }
        return false
      },
    }) as ComponentSandbox
  }
}

export default Sandbox
