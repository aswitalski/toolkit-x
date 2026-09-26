window.loadToolkit = async configureLoader => {

  if (configureLoader) {
    configureLoader();
  }

  const Toolkit = await loader.require('core/toolkit');
  const nodes = await loader.require('core/nodes');

  Object.assign(Toolkit.prototype, nodes, {
    Browser: await loader.require('core/browser'),
    Description: await loader.require('core/description'),
    Diff: await loader.require('core/diff'),
    Dispatcher: await loader.require('core/dispatcher'),
    Lifecycle: await loader.require('core/lifecycle'),
    Patch: await loader.require('core/patch'),
    Plugins: await loader.require('core/plugins'),
    Reconciler: await loader.require('core/reconciler'),
    Reducers: await loader.require('core/reducers'),
    Renderer: await loader.require('core/renderer'),
    Sandbox: await loader.require('core/sandbox'),
    Service: await loader.require('core/service'),
    Template: await loader.require('core/template'),
    VirtualDOM: await loader.require('core/virtual-dom'),
    utils: await loader.require('core/utils'),
    noop: () => {},
  });

  const scope = typeof window === 'undefined' ? global : window;
  scope.opr = scope.opr || {};
  scope.opr.Toolkit = new Toolkit();
};
