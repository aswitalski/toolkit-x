import type { ElementDescription, Listener } from './description.js'
import { getAttributeName, getEventName } from './utils.js'

/* Style and properties are set by name, as by the original assignments. */
type StyleMap = Record<string, string | null>
type PropertyMap = Record<string, unknown>

/*
 * Writes to the rendered elements, shared by the initial rendering and
 * the patches, so that both follow the same rules. Custom attributes and
 * listeners use the names as given, others are mapped to the DOM names.
 */
const DOM = {
  setClassName(element: HTMLElement, className: string) {
    element.className = className
  },

  setStyleProperty(element: HTMLElement, name: string, value: string) {
    if (name.startsWith('--')) {
      element.style.setProperty(name, ` ${value}`)
    } else {
      ;(element.style as unknown as StyleMap)[name] = value
    }
  },

  removeStyleProperty(element: HTMLElement, name: string) {
    if (name.startsWith('--')) {
      element.style.removeProperty(name)
    } else {
      ;(element.style as unknown as StyleMap)[name] = null
    }
  },

  setAttribute(
    element: HTMLElement,
    name: string,
    value: string,
    isCustom: boolean,
  ) {
    const attr = isCustom ? name : getAttributeName(name)
    element.setAttribute(attr, value)
  },

  removeAttribute(element: HTMLElement, name: string, isCustom: boolean) {
    const attr = isCustom ? name : getAttributeName(name)
    element.removeAttribute(attr)
  },

  setDataAttribute(element: HTMLElement, name: string, value: string) {
    element.dataset[name] = value
  },

  removeDataAttribute(element: HTMLElement, name: string) {
    delete element.dataset[name]
  },

  addListener(
    element: HTMLElement,
    name: string,
    listener: Listener,
    isCustom: boolean,
  ) {
    const event = isCustom ? name : getEventName(name)
    element.addEventListener(event, listener)
  },

  removeListener(
    element: HTMLElement,
    name: string,
    listener: Listener,
    isCustom: boolean,
  ) {
    const event = isCustom ? name : getEventName(name)
    element.removeEventListener(event, listener)
  },

  setProperty(element: HTMLElement, key: string, value: unknown) {
    ;(element as unknown as PropertyMap)[key] = value
  },

  deleteProperty(element: HTMLElement, key: string) {
    delete (element as unknown as PropertyMap)[key]
  },

  /**
   * Creates a new DOM Element based on the specified description.
   */
  createElement(description: ElementDescription): HTMLElement {
    const element = document.createElement(description.name)
    if (description.class) {
      this.setClassName(element, description.class)
    }
    for (const [name, value] of Object.entries(description.style ?? {})) {
      this.setStyleProperty(element, name, value)
    }
    for (const [name, listener] of Object.entries(
      description.listeners ?? {},
    )) {
      this.addListener(element, name, listener, false)
    }
    for (const [name, value] of Object.entries(description.attrs ?? {})) {
      this.setAttribute(element, name, value, false)
    }
    for (const [name, value] of Object.entries(description.dataset ?? {})) {
      this.setDataAttribute(element, name, value)
    }
    for (const [key, value] of Object.entries(description.properties ?? {})) {
      this.setProperty(element, key, value)
    }
    for (const [name, value] of Object.entries(
      description.custom?.attrs ?? {},
    )) {
      this.setAttribute(element, name, value, true)
    }
    for (const [name, listener] of Object.entries(
      description.custom?.listeners ?? {},
    )) {
      this.addListener(element, name, listener, true)
    }
    return element
  },
}

export default DOM
