import toolkit, { type Template } from '../src/index.js'

describe('Toolkit', () => {
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

    await toolkit.configure(settings)

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
    await toolkit.configure({})

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
})
