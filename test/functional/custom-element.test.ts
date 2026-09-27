import type { ComponentElement } from '../../src/core/renderer.js'
import toolkit, { type Template } from '../../src/index.js'

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
})
