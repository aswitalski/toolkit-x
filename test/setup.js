import toolkit from '../src/index.ts'

toolkit.assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

globalThis.opr = {
  Toolkit: toolkit,
}

toolkit.configure({
  debug: true,
})

const container = document.createElement('main')

globalThis.createFromTemplate = (template, parent) =>
  opr.Toolkit.VirtualDOM.createFromDescription(
    opr.Toolkit.Template.describe(template),
    parent,
  )

globalThis.createRootInstance = RootClass => {
  const { Template, VirtualDOM } = opr.Toolkit
  const description = Template.describe([RootClass])
  const root = VirtualDOM.createWebComponent(description, null, null, false)
  root.container = container
  return root
}

globalThis.createWebComponent = async WebComponent => {
  const instance = createRootInstance(WebComponent)
  const container = document.createElement('main')
  await instance.init(container)
  return instance
}

globalThis.createRoot = (template = null, container) => {
  const { Template, VirtualDOM } = opr.Toolkit
  class Root extends opr.Toolkit.Root {
    render() {
      return template
    }
  }
  const root = createRootInstance(Root)
  root.container = document.createElement('main')
  const node = VirtualDOM.createFromDescription(Template.describe(template))
  if (node) {
    root.insertChild(node)
  }
  return root
}

globalThis.createComponent = (template = null) => {
  class Component extends opr.Toolkit.Component {
    render() {
      return template
    }
  }
  return createFromTemplate([Component])
}
