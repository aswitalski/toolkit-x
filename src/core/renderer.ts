import type {
  ElementDescription,
  NodeDescription,
  Props,
} from './description.js'
import {
  type ComponentElement,
  createComponentElement,
} from './custom-element.js'
import Diff from './diff.js'
import type { Command, State } from './dispatcher.js'
import DOM from './dom.js'
import type { Component, WebComponent } from './nodes.js'
import type Patch from './patch.js'

/* Information about a root component update, passed to plugin listeners. */
export interface Update {
  command: Command
  root: WebComponent
  state: {
    from: State | undefined
    to: State
  }
  patches?: Patch[]
}

const Renderer = {
  /**
   * Calls the component render method and transforms the returned template
   * into the normalised description of the rendered node.
   */
  render(
    component: Component,
    props: Props = {},
    children: unknown[] = [],
  ): NodeDescription | null {
    return component.renderDescription(props, children)
  },

  /**
   * Updates the Web component and patches the DOM tree
   * to match the new component state.
   */
  update(
    root: WebComponent,
    from: State | undefined,
    to: State,
    command: Command,
  ) {
    const update: Update = {
      command,
      root,
      state: {
        from,
        to,
      },
    }

    this.onBeforeUpdate(update, root)

    const diff = new Diff(root, from, to)
    // set when the patches are calculated, kept when rendering them fails
    root.state = to
    update.patches = diff.apply()

    this.onAfterUpdate(update, root)
  },

  /**
   * Notifies the observers about upcoming update.
   */
  onBeforeUpdate(update: Update, root: WebComponent) {
    root.plugins!.notify('before-update', update)
  },

  /**
   * Notifies the observers about completed update.
   */
  onAfterUpdate(update: Update, root: WebComponent) {
    root.plugins!.notify('after-update', update)
  },

  /**
   * Creates a new Custom Element instance assigned to specified Web Component.
   */
  createCustomElement(root: WebComponent): ComponentElement {
    return createComponentElement(root)
  },

  /**
   * Creates a new DOM Element based on the specified description.
   */
  createElement(description: ElementDescription): HTMLElement {
    return DOM.createElement(description)
  },
}

export default Renderer
