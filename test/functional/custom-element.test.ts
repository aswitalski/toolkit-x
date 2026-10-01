import type { ComponentElement } from '../../src/core/custom-element.js'
import toolkit, { type Template, type WebComponent } from '../../src/index.js'
import { type VirtualElement } from '../../src/core/nodes.js'

describe('Custom element', () => {
  let container: HTMLElement

  let counter = 0

  beforeEach(() => {
    container = document.createElement('section')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('destroys the root only once', async () => {
    // given
    const onDestroyed = vi.fn()
    class Child extends toolkit.Component {
      onDestroyed() {
        onDestroyed()
      }
      render(): Template {
        return ['span']
      }
    }
    class SomeRoot extends toolkit.WebComponent {
      static elementName = `custom-element-root-${counter++}`

      render(): Template {
        return ['div', [Child]]
      }
    }
    const root = await toolkit.render(SomeRoot, container)
    const element = root.ref as ComponentElement

    // when
    element.destroy()
    element.destroy()

    // then
    expect(onDestroyed).toHaveBeenCalledOnce()
  })

  it('rejects mounting when a stylesheet fails to load', async () => {
    // given
    class SomeRoot extends toolkit.WebComponent {
      static elementName = `custom-element-root-${counter++}`

      static styles = ['/does-not-exist.css']

      render(): Template {
        return ['div']
      }
    }

    // when
    const rendering = toolkit.render(SomeRoot, container)

    // then
    await expect(rendering).rejects.toThrow(
      'Error loading stylesheets: /does-not-exist.css',
    )
  })

  it('rejects mounting when getting the initial state fails', async () => {
    // given
    class SomeRoot extends toolkit.WebComponent {
      static elementName = `custom-element-root-${counter++}`

      getInitialState(): Promise<object> {
        throw new Error('No initial state')
      }

      render(): Template {
        return ['div']
      }
    }

    // when
    const rendering = toolkit.render(SomeRoot, container)

    // then
    await expect(rendering).rejects.toThrow('No initial state')
  })

  it('destroys the roots created by an update that fails', async () => {
    // given
    class Nested extends toolkit.WebComponent {
      static elementName = `custom-element-root-${counter++}`

      render(): Template {
        return ['span']
      }
    }
    class Failing extends toolkit.Component {
      render(): Template {
        throw new Error('Failed to render')
      }
    }
    class App extends toolkit.WebComponent<object, { failing: boolean }> {
      getInitialState() {
        return { failing: false }
      }

      render(): Template {
        return this.props.failing ? ['main', [Nested], [Failing]] : ['main']
      }
    }
    const app = await toolkit.render(App, container)
    const tracked = toolkit.tracked.length
    const destroy = vi.spyOn(Nested.prototype, 'destroy')

    // when
    const update = app.commands.update({ failing: true })

    // then
    await expect(update).rejects.toThrow('Failed to render')
    expect(destroy).toHaveBeenCalledOnce()
    const nested = destroy.mock.contexts[0] as WebComponent
    assert.equal(nested.plugins, null)
    assert.equal(toolkit.tracked.length, tracked)
    assert.equal(container.querySelector(Nested.elementName), null)
  })

  it('destroys a root failing to create its light DOM nodes', async () => {
    // given
    class Nested extends toolkit.WebComponent {
      static elementName = `custom-element-root-${counter++}`

      render(): Template {
        return ['slot']
      }
    }
    class Failing extends toolkit.Component {
      render(): Template {
        throw new Error('Failed to render')
      }
    }
    class App extends toolkit.WebComponent<object, { failing: boolean }> {
      getInitialState() {
        return { failing: false }
      }

      render(): Template {
        return this.props.failing ? ['main', [Nested, [Failing]]] : ['main']
      }
    }
    const app = await toolkit.render(App, container)
    const tracked = toolkit.tracked.length
    const destroy = vi.spyOn(Nested.prototype, 'destroy')

    // when
    const update = app.commands.update({ failing: true })

    // then
    await expect(update).rejects.toThrow('Failed to render')
    expect(destroy).toHaveBeenCalledOnce()
    assert.equal(toolkit.tracked.length, tracked)
  })

  it('renders the props passed to a nested root', async () => {
    // given
    class Nested extends toolkit.WebComponent<{ value: number }> {
      static elementName = `custom-element-root-${counter++}`

      render(): Template {
        return ['span', String(this.props.value)]
      }
    }
    class App extends toolkit.WebComponent<object, { value: number }> {
      getInitialState() {
        return { value: 1 }
      }

      render(): Template {
        return ['main', [Nested, { value: this.props.value }]]
      }
    }
    const app = await toolkit.render(App, container)
    const nested = (app.content as VirtualElement).children![0] as WebComponent
    await nested.ready

    // then
    assert.equal(nested.shadow!.textContent, '1')

    // when
    await app.commands.update({ value: 2 })

    // then
    assert.deepEqual(nested.state, { value: 2 })
    assert.equal(nested.shadow!.textContent, '2')
  })

  it('updates the parent when a nested root fails to render', async () => {
    // given
    class Nested extends toolkit.WebComponent<{ value: number }> {
      static elementName = `custom-element-root-${counter++}`

      render(): Template {
        if (this.props.value < 0) {
          throw new Error('Negative value')
        }
        return ['span', String(this.props.value)]
      }
    }
    class App extends toolkit.WebComponent<object, { value: number }> {
      getInitialState() {
        return { value: 1 }
      }

      render(): Template {
        const { value } = this.props
        return ['main', [Nested, { value }], ['output', String(value)]]
      }
    }
    const app = await toolkit.render(App, container)
    const main = app.content as VirtualElement
    const nested = main.children![0] as WebComponent
    await nested.ready

    // when
    const update = app.commands.update({ value: -1 })

    // then
    await expect(update).rejects.toThrow('Negative value')
    // the patches after the nested root are applied
    assert.equal(main.ref.querySelector('output')!.textContent, '-1')
    // the nested root keeps its description and its content
    assert.deepEqual(nested.description.props, { value: 1 })
    assert.equal(nested.shadow!.textContent, '1')

    // when
    await app.commands.update({ value: 2 })

    // then
    assert.equal(nested.shadow!.textContent, '2')
    assert.equal(main.ref.querySelector('output')!.textContent, '2')
  })

  it('throws the errors of all nested roots failing to render', async () => {
    // given
    class Nested extends toolkit.WebComponent<{ value: number }> {
      static elementName = `custom-element-root-${counter++}`

      render(): Template {
        if (this.props.value < 0) {
          throw new Error(`Negative value: ${this.props.value}`)
        }
        return ['span', String(this.props.value)]
      }
    }
    class App extends toolkit.WebComponent<object, { value: number }> {
      getInitialState() {
        return { value: 1 }
      }

      render(): Template {
        const { value } = this.props
        return ['main', [Nested, { value }], [Nested, { value: value * 2 }]]
      }
    }
    const app = await toolkit.render(App, container)
    const main = app.content as VirtualElement
    await Promise.all(main.children!.map(node => (node as WebComponent).ready))

    // when
    let error: unknown
    try {
      await app.commands.update({ value: -1 })
    } catch (thrown) {
      error = thrown
    }

    // then
    assert(error instanceof AggregateError)
    assert.deepEqual(
      error.errors.map((cause: Error) => cause.message),
      ['Negative value: -1', 'Negative value: -2'],
    )
  })

  it('renders and updates the child nodes in the light DOM', async () => {
    // given
    class List extends toolkit.WebComponent {
      static elementName = `custom-element-root-${counter++}`

      render(): Template {
        return ['slot']
      }
    }
    class App extends toolkit.WebComponent<object, { items: string[] }> {
      getInitialState() {
        return { items: ['a', 'b'] }
      }

      render(): Template {
        return [
          'main',
          [
            List,
            ...this.props.items.map(
              item => ['span', { key: item }, item] as const,
            ),
          ],
        ]
      }
    }
    const app = await toolkit.render(App, container)
    const list = (app.content as VirtualElement).children![0] as WebComponent
    const texts = () => [...list.ref.childNodes].map(node => node.textContent)

    // then
    assert.deepEqual(texts(), ['a', 'b'])
    assert.equal(list.childNodes!.length, 2)

    // when
    await app.commands.update({ items: ['b', 'c', 'a'] })

    // then
    assert.deepEqual(texts(), ['b', 'c', 'a'])
    assert.equal(list.childNodes!.length, 3)

    // when
    await app.commands.update({ items: ['c'] })

    // then
    assert.deepEqual(texts(), ['c'])
    assert.equal(list.childNodes!.length, 1)
  })
})
