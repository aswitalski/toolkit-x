{
  const Toolkit = loader.get('core/toolkit');
  const nodes = loader.get('core/nodes');

  Object.assign(Toolkit.prototype, nodes, {
    Browser: loader.get('core/browser'),
    Description: loader.get('core/description'),
    Diff: loader.get('core/diff'),
    Dispatcher: loader.get('core/dispatcher'),
    Lifecycle: loader.get('core/lifecycle'),
    Patch: loader.get('core/patch'),
    Plugins: loader.get('core/plugins'),
    Reconciler: loader.get('core/reconciler'),
    Renderer: loader.get('core/renderer'),
    Sandbox: loader.get('core/sandbox'),
    Service: loader.get('core/service'),
    Reducers: loader.get('core/reducers'),
    Template: loader.get('core/template'),
    VirtualDOM: loader.get('core/virtual-dom'),
    utils: loader.get('core/utils'),
    noop: () => {},
  });

  const scope = typeof window === 'undefined' ? global : window;
  scope.opr = scope.opr || {};
  scope.opr.Toolkit = new Toolkit();
}
