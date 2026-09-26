import Browser from './core/browser.js'
import Description from './core/description.js'
import Diff from './core/diff.js'
import Dispatcher from './core/dispatcher.js'
import Lifecycle from './core/lifecycle.js'
import nodes from './core/nodes.js'
import Patch from './core/patch.js'
import Plugins from './core/plugins.js'
import Reconciler from './core/reconciler.js'
import Reducers from './core/reducers.js'
import Renderer from './core/renderer.js'
import Sandbox from './core/sandbox.js'
import Service from './core/service.js'
import Template from './core/template.js'
import Toolkit, { toolkit } from './core/toolkit.js'
import utils from './core/utils.js'
import VirtualDOM from './core/virtual-dom.js'

/* The modules and node classes available on the Toolkit instance. */
type ToolkitModules = typeof nodes & {
  Browser: typeof Browser
  Description: typeof Description
  Diff: typeof Diff
  Dispatcher: typeof Dispatcher
  Lifecycle: typeof Lifecycle
  Patch: typeof Patch
  Plugins: typeof Plugins
  Reconciler: typeof Reconciler
  Reducers: typeof Reducers
  Renderer: typeof Renderer
  Sandbox: typeof Sandbox
  Service: typeof Service
  Template: typeof Template
  VirtualDOM: typeof VirtualDOM
  utils: typeof utils
  noop: () => void
}

declare module './core/toolkit.js' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Toolkit extends ToolkitModules {}
}

Object.assign(Toolkit.prototype, nodes, {
  Browser,
  Description,
  Diff,
  Dispatcher,
  Lifecycle,
  Patch,
  Plugins,
  Reconciler,
  Reducers,
  Renderer,
  Sandbox,
  Service,
  Template,
  VirtualDOM,
  utils,
  noop: () => {},
})

export {
  Component,
  WebComponent,
  Root,
  VirtualElement,
  VirtualNode,
} from './core/nodes.js'

export {
  Browser,
  Description,
  Diff,
  Dispatcher,
  Lifecycle,
  Patch,
  Plugins,
  Reconciler,
  Reducers,
  Renderer,
  Sandbox,
  Service,
  Template,
  Toolkit,
  VirtualDOM,
  utils,
}

export default toolkit
