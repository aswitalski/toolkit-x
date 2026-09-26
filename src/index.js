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
