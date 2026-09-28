import type { ComponentElement } from '../../src/core/custom-element.js'
import toolkit, {
  type Template,
  type VirtualElement,
  type WebComponent,
} from '../../src/index.js'

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
    app.commands.update({ items: ['b', 'c', 'a'] })

    // then
    assert.deepEqual(texts(), ['b', 'c', 'a'])
    assert.equal(list.childNodes!.length, 3)

    // when
    app.commands.update({ items: ['c'] })

    // then
    assert.deepEqual(texts(), ['c'])
    assert.equal(list.childNodes!.length, 1)
  })
})
