import type { Template as BragiTemplate } from './bragi.js'
import Browser from './browser.js'
import {
  ComponentDescription,
  ElementDescription,
  type Listener,
  type NodeDescription,
  type Props,
  TextDescription,
} from './description.js'
import { Component, type ComponentClass } from './nodes.js'
import { toolkit } from './toolkit.js'
import utils from './utils.js'

export type ItemType =
  | 'component'
  | 'function'
  | 'null'
  | 'node'
  | 'props'
  | 'unknown'
  | 'string'
  | 'number'
  | 'bigint'
  | 'boolean'
  | 'symbol'
  | 'undefined'

const isDefined = <T>(value: T): value is NonNullable<T> =>
  value !== undefined && value !== null
const isFalsy = (template: unknown) => template === null || template === false
const isNotEmpty = (object: object) => Boolean(Object.keys(object).length)

const Template = {
  /**
   * Creates a normalized Description of given template.
   */
  describe(template: unknown): NodeDescription | null {
    if (isFalsy(template)) {
      return null
    }

    if (Array.isArray(template) && template.length) {
      let description!: ComponentDescription | ElementDescription
      for (const [item, type, index] of (template as unknown[]).map(
        (item, index): [unknown, ItemType, number] => [
          item,
          this.getItemType(item),
          index,
        ],
      )) {
        if (index === 0) {
          switch (type) {
            case 'string':
              description = new ElementDescription(item as string)
              break
            case 'component':
            case 'function':
              description = new ComponentDescription(
                toolkit.resolveComponentClass(item, type),
              )
              break
            default:
              console.error(
                'Invalid node type:',
                item,
                `(${type}) at index: ${index}, template:`,
                template,
              )
              throw new Error(`Invalid node type specified: ${type}`)
          }
          continue
        }
        if (index === 1 && type === 'props') {
          if (description.type === 'component') {
            this.assignPropsToComponent(item as Props, description)
          } else if (description.type === 'element') {
            this.assignPropsToElement(item as Props, description)
          }
          continue
        }
        if (isFalsy(item)) {
          continue
        }
        if (type === 'string' || type === 'number' || item === true) {
          description.children = description.children || []
          // eslint-disable-next-line @typescript-eslint/no-base-to-string -- only strings, numbers and true
          description.children.push(new TextDescription(String(item)))
          continue
        } else if (type === 'node') {
          description.children = description.children || []
          description.children.push(this.describe(item)!)
        } else {
          console.error(
            'Invalid item',
            item,
            `at index: ${index}, template:`,
            template,
          )
          throw new Error(`Invalid item specified: ${type}`)
        }
      }

      if (toolkit.isDebug()) {
        utils.deepFreeze(description)
      }
      return description
    }

    console.error('Invalid template definition:', template)
    throw new Error('Expecting array, null or false')
  },

  /**
   * Returns a new props object supplemented by overriden values.
   */
  normalizeProps(...overrides: Array<Props | undefined>): Props {
    const result: Props = {}
    for (const override of overrides) {
      for (const [key, value] of Object.entries(override || {})) {
        if (result[key] === undefined && value !== undefined) {
          result[key] = value
        }
      }
    }
    return result
  },

  /**
   * Normalizes specified element props object and returns either
   * a non-empty object containing only supported props or null.
   */
  normalizeComponentProps(
    props: Props | undefined,
    ComponentClass: { defaultProps?: Props },
  ): Props {
    return this.normalizeProps(props, ComponentClass.defaultProps || {})
  },

  assignPropsToComponent(object: Props, description: ComponentDescription) {
    const props = this.getComponentProps(
      object,
      description.component,
      description.isRoot,
    )
    if (props) {
      description.props = props
      if (isDefined(props.key)) {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string -- keys are stringified as given
        description.key = String(props.key)
      }
      if (props.attrs) {
        const attrs = this.getCustomAttributes(props.attrs as Props, true)
        if (attrs) {
          description.attrs = attrs
        }
      }
    }
  },

  getComponentProps(
    object: Props,
    ComponentClass: ComponentClass,
    isRoot: boolean,
  ): Props | null {
    const props = isRoot
      ? object
      : this.normalizeComponentProps(object, ComponentClass)
    return isNotEmpty(props) ? props : null
  },

  assignPropsToElement(props: Props, description: ElementDescription) {
    for (const [key, value] of Object.entries(props)) {
      if (key === 'key') {
        if (isDefined(value)) {
          // eslint-disable-next-line @typescript-eslint/no-base-to-string -- keys are stringified as given
          description.key = String(value)
        }
      } else if (key === 'class') {
        const className = this.getClassName(value)
        if (className) {
          description.class = className
        }
      } else if (key === 'style') {
        const style = this.getStyle(value as Props)
        if (style) {
          description.style = style
        }
      } else if (key === 'dataset') {
        const dataset = this.getDataset(value as Props)
        if (dataset) {
          description.dataset = dataset
        }
      } else if (key === 'properties') {
        const properties = this.getProperties(value as Props)
        if (properties) {
          description.properties = properties
        }
      } else if (key === 'attrs') {
        const customAttrs = this.getCustomAttributes(value as Props)
        if (customAttrs) {
          description.custom = description.custom || {}
          description.custom.attrs = customAttrs
        }
      } else if (key === 'on') {
        const customListeners = this.getCustomListeners(value as Props)
        if (customListeners) {
          description.custom = description.custom || {}
          description.custom.listeners = customListeners
        }
      } else {
        const {
          isAttributeSupported,
          isAttributeValid,
          getValidElementNamesFor,
          isEventSupported,
        } = Browser

        if (isAttributeSupported(key)) {
          const attr = this.getAttributeValue(value)
          if (isDefined(attr)) {
            description.attrs = description.attrs || {}
            description.attrs[key] = attr
          }
          if (toolkit.isDebug()) {
            const element = description.name
            if (attr === undefined) {
              console.warn(
                `Invalid undefined value for attribute "${key}"`,
                `on element "${element}".`,
              )
            }
            if (!element.includes('-') && !isAttributeValid(key, element)) {
              const names = (getValidElementNamesFor(key) as readonly string[])
                .map(key => `"${key}"`)
                .join(', ')
              const message = `The "${key}" attribute is not supported on "${
                element
              }" elements.`
              const hint = `Use one of ${names}.`
              console.warn(message, hint)
            }
          }
        } else if (isEventSupported(key)) {
          const listener = this.getListener(value, key)
          if (listener) {
            description.listeners = description.listeners || {}
            description.listeners[key] = value as Listener
          }
        } else {
          console.warn(
            `Unsupported property "${key}" on element "${description.name}".`,
          )
        }
      }
    }
  },

  /**
   * Returns the type of item used in the array representing node template.
   */
  getItemType(item: unknown): ItemType {
    const type = typeof item
    switch (type) {
      case 'function':
        if ((item as ComponentClass).prototype instanceof Component) {
          return 'component'
        }
        return 'function'
      case 'object':
        if (item === null) {
          return 'null'
        } else if (Array.isArray(item)) {
          return 'node'
        } else if ((item as object).constructor === Object) {
          return 'props'
        }
        return 'unknown'
      default:
        return type
    }
  },

  /**
   * Resolves any object to a space separated string of class names.
   */
  getClassName(value: unknown): string {
    if (!value) {
      return ''
    }
    if (typeof value === 'string') {
      return value
    }
    if (Array.isArray(value)) {
      return value
        .reduce((result: string[], item) => {
          if (!item) {
            return result
          }
          if (typeof item === 'string') {
            result.push(item)
            return result
          }
          result.push(this.getClassName(item))
          return result
        }, [])
        .filter(item => item)
        .join(' ')
    }
    if (typeof value === 'object') {
      const keys = Object.keys(value)
      if (keys.length === 0) {
        return ''
      }
      return Object.keys(value)
        .map(key => (value as Props)[key] && key)
        .filter(item => item)
        .join(' ')
    }
    throw new Error(`Invalid value: ${JSON.stringify(value)}`)
  },

  /**
   * Returns either a non-empty style object containing only understood
   * styling rules or null.
   */
  getStyle(object: Props): Record<string, string> | null {
    toolkit.assert(
      object.constructor === Object,
      'Style must be a plain object!',
    )

    const reduceToNonEmptyValues = (
      style: Record<string, string>,
      [name, value]: [string, unknown],
    ) => {
      const string = this.getStyleProperty(value, name)
      if (isDefined(string)) {
        style[name] = string
      }
      return style
    }

    const entries = Object.entries(object)

    if (toolkit.isDebug()) {
      for (const [key, value] of entries.filter(
        ([key]) => !Browser.isStyleSupported(key),
      )) {
        console.warn(`Unsupported style property, key: ${key}, value:`, value)
      }
    }

    const style = Object.entries(object)
      .filter(([key, value]) => Browser.isStyleSupported(key))
      .reduce(reduceToNonEmptyValues, {})
    return isNotEmpty(style) ? style : null
  },

  getStyleProperty(value: unknown, name: string): string | null {
    if (typeof value === 'string') {
      return value || "''"
    } else if ([true, false, null, undefined].includes(value as boolean)) {
      return null
    } else if (Array.isArray(value)) {
      return value.join('')
    } else if (typeof value === 'number') {
      return String(value)
    } else if (typeof value === 'object') {
      let whitelist
      if (name === 'filter') {
        whitelist = Browser.SUPPORTED_FILTERS
      } else if (name === 'transform') {
        whitelist = Browser.SUPPORTED_TRANSFORMS
      } else {
        throw new Error(`Unknown function list: ${JSON.stringify(value)}`)
      }
      return this.getFunctionList(value as Props, whitelist)
    }
    throw new Error(`Invalid style property value: ${JSON.stringify(value)}`)
  },

  /**
   * Returns a multi-property string value.
   */
  getFunctionList(object: Props, whitelist?: readonly string[]): string {
    const composite: Record<string, string> = {}
    let entries = Object.entries(object)
    if (whitelist) {
      entries = entries.filter(([key, value]) => whitelist.includes(key))
    }
    for (const [key, value] of entries) {
      const stringValue = this.getAttributeValue(value, /*= allowEmpty */ false)
      if (isDefined(stringValue)) {
        composite[key] = stringValue
      }
    }
    return Object.entries(composite)
      .map(([key, value]) => `${key}(${value})`)
      .join(' ')
  },

  getListener(value: unknown, name: string): Listener | null {
    if (typeof value === 'function') {
      return value as Listener
    }
    if (value === null || value === false || value === undefined) {
      return null
    }
    throw new Error(`Invalid listener specified for event: ${name}`)
  },

  /**
   * Resolves given value to a string.
   */
  getAttributeValue(
    value: unknown,
    allowEmpty = true,
  ): string | null | undefined {
    if (value === true || value === '') {
      return allowEmpty ? '' : null
    } else if (typeof value === 'string') {
      return value
    } else if (value === null || value === false) {
      return null
    } else if (value === undefined) {
      return undefined
    } else if (Array.isArray(value)) {
      return value.join('')
    } else if (['object', 'function', 'symbol'].includes(typeof value)) {
      throw new Error(`Invalid attribute value: ${JSON.stringify(value)}!`)
    }
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- objects are rejected above
    return String(value)
  },

  /**
   * Returns either a non-empty dataset object or null.
   */
  getDataset(object: Props): Record<string, string> | null {
    const dataset: Record<string, string> = {}
    for (const key of Object.keys(object)) {
      const value = this.getAttributeValue(object[key])
      if (isDefined(value)) {
        dataset[key] = value
      }
    }
    return isNotEmpty(dataset) ? dataset : null
  },

  /**
   * Returns either a non-empty object containing properties set
   * directly on a rendered DOM Element or null.
   */
  getProperties(object: Props): Props | null {
    return isNotEmpty(object) ? object : null
  },

  getCustomAttributes(
    object: Props,
    forComponent?: boolean,
  ): Record<string, string> | null {
    console.assert(
      object.constructor === Object,
      'Expecting object for custom attributes!',
    )
    const attrs: Record<string, string> = {}
    for (const [key, value] of Object.entries(object)) {
      const attr = this.getAttributeValue(value, /*= allowEmpty */ true)
      if (isDefined(attr)) {
        const name = forComponent ? utils.lowerDash(key) : key
        attrs[name] = attr
      }
    }
    return isNotEmpty(attrs) ? attrs : null
  },

  getCustomListeners(object: Props): Record<string, Listener> | null {
    console.assert(
      object.constructor === Object,
      'Expecting object for custom listeners!',
    )
    const listeners: Record<string, Listener> = {}
    for (const [key, value] of Object.entries(object)) {
      const listener = this.getListener(value, key)
      if (listener) {
        listeners[key] = listener
      }
    }
    return isNotEmpty(listeners) ? listeners : null
  },
}

/* A Bragi template, see bragi.ts, sharing its name with the module above. */
type Template = BragiTemplate

export default Template
