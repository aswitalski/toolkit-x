{
  const isFunction = (target, property) =>
      typeof target[property] === 'function';

  const delegated = [
    'commands',
    'constructor',
    'container',
    'dispatch',
    'elementName',
  ];
  const methods = [
    'connectTo',
  ];
  const pluginMethods = [];

  const createBoundListener = (listener, component, context) => {
    const boundListener = listener.bind(context);
    boundListener.source = listener;
    boundListener.component = component;
    return boundListener;
  };

  class Sandbox {

    static registerPluginMethod(name) {
      pluginMethods.push(name);
    }

    static create(component) {
      const blacklist =
          Object.getOwnPropertyNames(opr.Toolkit.Component.prototype);
      const state = {};
      const autobound = {};
      return new Proxy(component, {
        get: (target, property, receiver) => {
          if (property === 'props') {
            return state.props || target.state || {};
          }
          if (property === 'children') {
            return state.children || [];
          }
          if (property === 'host') {
            return target.isRoot() ? target.shadow.host : null;
          }
          if (property === 'ref') {
            if (target.isRoot()) {
              // returns rendered node instead of custom element for usage of
              // this.ref.querySelector
              return target.content.ref;
            }
            return target.ref;
          }
          if (property === '$component') {
            return component;
          }
          if (delegated.includes(property)) {
            return target[property];
          }
          if (methods.includes(property) && isFunction(target, property)) {
            return createBoundListener(target[property], target, target);
          }
          if (pluginMethods.includes(property)) {
            return target.rootNode[property];
          }
          if (blacklist.includes(property)) {
            return undefined;
          }
          if (isFunction(autobound, property)) {
            return autobound[property];
          }
          if (isFunction(target, property)) {
            return autobound[property] =
                       createBoundListener(target[property], target, receiver);
          }
          return target[property];
        },
        set: (target, property, value) => {
          if (property === 'props') {
            state.props = value;
            return true;
          }
          if (property === 'children') {
            state.children = value || [];
            return true;
          }
          return false;
        },
      });
    }
  }

  module.exports = Sandbox;
}
