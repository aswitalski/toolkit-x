import type { ComponentElement } from '../src/core/custom-element.js'
import toolkit, {
  type PluginSandbox,
  type Template,
  type WebComponent,
} from '../src/index.js'
import Sandbox from '../src/core/sandbox.js'
import { createFromTemplate, createRootInstance } from './helpers.js'

describe('Toolkit', () => {
  it('exposes only the public API', async () => {
    // given
    const index = await import('../src/index.js')
    // the members of the instance and its prototype chain
    const members = new Set<string>()
    for (
      let object: object | null = toolkit;
      object && object !== Object.prototype;
      object = Object.getPrototypeOf(object) as object | null
    ) {
      Object.getOwnPropertyNames(object).forEach(name => members.add(name))
    }
    members.delete('constructor')

    // then
    assert.deepEqual(Object.keys(index).sort(), [
      'Component',
      'Root',
      'Service',
      'WebComponent',
      'default',
      'utils',
    ])
    assert.deepEqual(Object.keys(toolkit.utils).sort(), [
      'createUUID',
      'debounce',
      'postRender',
      'throttle',
    ])
    assert.deepEqual([...members].sort(), [
      'Component',
      'Root',
      'Service',
      'WebComponent',
      'assert',
      'configure',
      'createRoot',
      'isDebug',
      'noop',
      'render',
      'reset',
      'settings',
      'tracked',
      'utils',
      'warn',
    ])
  })

  it('calls lifecycle methods in proper order', async () => {
    // given
    const lifecycle: string[] = []

    class App extends toolkit.Root {
      onCreated() {
        lifecycle.push('App created')
      }
      onAttached() {
        lifecycle.push('App attached')
      }
      render(): Template {
        return [Parent]
      }
    }

    class Parent extends toolkit.Component {
      onCreated() {
        lifecycle.push('Parent created')
      }
      onAttached() {
        lifecycle.push('Parent attached')
      }
      render(): Template {
        return [Child]
      }
    }

    class Child extends toolkit.Component {
      onCreated() {
        lifecycle.push('Child created')
      }
      onAttached() {
        lifecycle.push('Child attached')
      }
      render(): Template {
        return ['div']
      }
    }

    const settings = {
      plugins: [],
    }

    const container = document.createElement('section')
    container.style.display = 'none'
    document.body.appendChild(container)

    toolkit.configure(settings)

    await toolkit.render(App, container)

    assert.equal(lifecycle.length, 6)

    assert.equal(lifecycle[0], 'App created')
    assert.equal(lifecycle[1], 'Parent created')
    assert.equal(lifecycle[2], 'Child created')
    assert.equal(lifecycle[3], 'Child attached')
    assert.equal(lifecycle[4], 'Parent attached')
    assert.equal(lifecycle[5], 'App attached')
  })

  it('tracks rendered root components', async () => {
    // given
    class MainRoot extends toolkit.Root {
      render(): Template {
        return ['main']
      }
    }
    class ShadowRoot extends toolkit.Root {
      static elementName = 'some-root'
      render(): Template {
        return ['section']
      }
    }

    // given
    toolkit.reset()

    // when
    const mainRoot = await toolkit.render(MainRoot, document.body)
    const shadowRoot = await toolkit.render(ShadowRoot, document.body)

    // then
    assert.equal(toolkit.tracked.length, 2)

    // when
    shadowRoot.destroy()

    // then
    assert.equal(toolkit.tracked.length, 1)

    // when
    mainRoot.destroy()

    // then
    assert.equal(toolkit.tracked.length, 0)
  })

  describe('=> Configure', () => {
    class SomeRoot extends toolkit.Root {
      render(): Template {
        return ['main']
      }
    }

    const createPlugin = (name: string) => {
      const uninstall = vi.fn()
      return {
        name,
        install: vi.fn().mockReturnValue(uninstall),
        uninstall,
      }
    }

    afterEach(() => {
      toolkit.reset()
      toolkit.configure({ debug: true })
    })

    it('renders with the default settings when not configured', async () => {
      // given
      toolkit.reset()

      // when
      const root = await toolkit.render(SomeRoot, document.body)

      // then
      assert.deepEqual(toolkit.settings, { debug: false })
      assert.equal(toolkit.isDebug(), false)
      assert.deepEqual([...root.plugins!], [])
      assert.deepEqual(toolkit.tracked, [root])
    })

    it('switches the debug mode', () => {
      // given
      toolkit.reset()

      // when
      toolkit.configure({ debug: true })

      // then
      assert.equal(toolkit.isDebug(), true)

      // when
      toolkit.configure({ debug: false })

      // then
      assert.equal(toolkit.isDebug(), false)
    })

    it('keeps the current values of the options not provided', async () => {
      // given
      const plugin = createPlugin('plugin')
      toolkit.reset()
      toolkit.configure({ debug: true, plugins: [plugin] })
      await toolkit.render(SomeRoot, document.body)

      // when
      toolkit.configure({})

      // then
      assert.equal(toolkit.isDebug(), true)
      expect(plugin.uninstall).not.toHaveBeenCalled()

      // when
      toolkit.configure({ debug: false })

      // then
      assert.equal(toolkit.isDebug(), false)
      expect(plugin.uninstall).not.toHaveBeenCalled()

      // when
      toolkit.configure({ plugins: [] })

      // then
      assert.equal(toolkit.isDebug(), false)
      expect(plugin.uninstall).toHaveBeenCalledOnce()
    })

    it('replaces the plugins of the rendered roots', async () => {
      // given
      const previous = createPlugin('previous')
      const next = createPlugin('next')
      toolkit.reset()
      toolkit.configure({ plugins: [previous] })
      const root = await toolkit.render(SomeRoot, document.body)

      // when
      toolkit.configure({ plugins: [next] })

      // then
      expect(previous.uninstall).toHaveBeenCalledOnce()
      expect(next.install).toHaveBeenCalledExactlyOnceWith(root)
      assert.deepEqual(
        [...root.plugins!].map(plugin => plugin.name),
        ['next'],
      )

      // when
      const another = await toolkit.render(SomeRoot, document.body)

      // then
      expect(previous.install).toHaveBeenCalledOnce()
      expect(next.install).toHaveBeenLastCalledWith(another)
    })

    it('replaces the plugins of the roots not mounted yet', async () => {
      // given
      const previous = createPlugin('previous')
      const next = createPlugin('next')
      toolkit.reset()
      toolkit.configure({ plugins: [previous] })
      const root = await toolkit.createRoot(SomeRoot)

      // when
      toolkit.configure({ plugins: [next] })
      await root.mount(document.body)

      // then
      expect(previous.uninstall).toHaveBeenCalledOnce()
      expect(next.install).toHaveBeenCalledExactlyOnceWith(root)
    })

    it('keeps the plugins when configured with the same ones', async () => {
      // given
      const plugin = createPlugin('plugin')
      toolkit.reset()
      toolkit.configure({ plugins: [plugin] })
      await toolkit.render(SomeRoot, document.body)

      // when
      toolkit.configure({ debug: true, plugins: [plugin] })

      // then
      expect(plugin.uninstall).not.toHaveBeenCalled()
      expect(plugin.install).toHaveBeenCalledOnce()
      assert.equal(toolkit.isDebug(), true)
    })

    it('forgets the methods of the replaced plugins', () => {
      // given
      const register = (name: string) => ({
        name,
        permissions: ['register-method'],
        register: (sandbox: PluginSandbox) => sandbox.registerMethod!(name),
      })
      class Component extends toolkit.Component {}
      const root = createRootInstance(SomeRoot)
      Object.assign(root, { previous: 'previous value', next: 'next value' })
      const component = createFromTemplate([Component], root)
      const sandbox = component.sandbox as unknown as Record<string, unknown>
      toolkit.reset()
      toolkit.configure({ plugins: [register('previous')] })

      // when
      toolkit.configure({ plugins: [register('next')] })

      // then
      assert.equal(sandbox.previous, undefined)
      assert.equal(sandbox.next, 'next value')
    })

    it('stops tracking a root failing to be created', async () => {
      // given
      const plugin = {
        name: 'stylesheets',
        permissions: ['inject-stylesheets'],
      }
      class ElementRoot extends toolkit.Root {
        static elementName = 'failing-root'
      }
      toolkit.reset()
      toolkit.configure({ plugins: [plugin] })

      // when
      const createRoot = toolkit.createRoot(ElementRoot)

      // then
      await expect(createRoot).rejects.toThrow(
        "Plugin 'stylesheets' must provide the getStylesheets() method!",
      )
      assert.deepEqual(toolkit.tracked, [])
    })

    describe('=> Stylesheets', () => {
      const red = 'data:text/css,main{color:red}'
      const green = 'data:text/css,main{color:green}'

      const createStylesheetsPlugin = (name: string, stylesheet: string) => ({
        name,
        permissions: ['inject-stylesheets'],
        install: () => toolkit.noop,
        getStylesheets: () => [stylesheet],
      })

      let counter = 0

      const createElementRoot = () =>
        class ElementRoot extends toolkit.Root {
          static elementName = `stylesheets-root-${counter++}`
          render(): Template {
            return ['main']
          }
        }

      const getStyles = (root: WebComponent) =>
        [...root.shadow!.querySelectorAll('style')].map(
          style => style.textContent,
        )

      const getColor = (root: WebComponent) =>
        getComputedStyle(root.shadow!.querySelector('main')!).color

      it('loads the stylesheets of the new plugins', async () => {
        // given
        toolkit.reset()
        toolkit.configure({ plugins: [createStylesheetsPlugin('red', red)] })
        const root = await toolkit.render(createElementRoot(), document.body)
        assert.equal(getColor(root), 'rgb(255, 0, 0)')

        // when
        toolkit.configure({
          plugins: [createStylesheetsPlugin('green', green)],
        })
        await (root.ref as ComponentElement).stylesheetsLoaded

        // then
        assert.equal(getColor(root), 'rgb(0, 128, 0)')
        await vi.waitFor(() =>
          assert.deepEqual(getStyles(root), [`@import url(${green});`]),
        )
      })

      it('removes the stylesheets of the removed plugins', async () => {
        // given
        toolkit.reset()
        toolkit.configure({ plugins: [createStylesheetsPlugin('red', red)] })
        const root = await toolkit.render(createElementRoot(), document.body)

        // when
        toolkit.configure({ plugins: [] })

        // then
        await vi.waitFor(() => assert.deepEqual(getStyles(root), []))
        assert.equal(getColor(root), 'rgb(0, 0, 0)')
      })

      it('keeps the stylesheets not changed', async () => {
        // given
        toolkit.reset()
        const plugin = createStylesheetsPlugin('red', red)
        toolkit.configure({ plugins: [plugin] })
        const root = await toolkit.render(createElementRoot(), document.body)
        const style = root.shadow!.querySelector('style')

        // when
        toolkit.configure({ plugins: [plugin, createPlugin('other')] })

        // then
        assert.equal(root.shadow!.querySelector('style'), style)
      })

      it('mounts a root loading the stylesheets when reconfigured', async () => {
        // given
        toolkit.reset()
        toolkit.configure({ plugins: [createStylesheetsPlugin('red', red)] })
        const rendering = toolkit.render(createElementRoot(), document.body)

        // when
        toolkit.configure({
          plugins: [createStylesheetsPlugin('green', green)],
        })
        const root = await rendering
        await (root.ref as ComponentElement).stylesheetsLoaded

        // then
        assert.equal(getColor(root), 'rgb(0, 128, 0)')
        await vi.waitFor(() =>
          assert.deepEqual(getStyles(root), [`@import url(${green});`]),
        )
      })
    })
  })

  it('forgets plugin methods when reset', () => {
    // given
    class Root extends toolkit.Root {}
    class Component extends toolkit.Component {}
    const root = createRootInstance(Root)
    Object.assign(root, { getValue: 'root value' })
    const component = createFromTemplate([Component], root)
    const sandbox = component.sandbox as unknown as Record<string, unknown>
    Sandbox.registerPluginMethod('getValue')

    // then
    assert.equal(sandbox.getValue, 'root value')

    // when
    toolkit.reset()
    toolkit.configure({ debug: true })

    // then
    assert.equal(sandbox.getValue, undefined)
  })
})
