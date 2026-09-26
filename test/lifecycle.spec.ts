import toolkit, { type ComponentClass, type Template } from '../src/index.js'
import {
  type AnyNode,
  createFromTemplate,
  createRootInstance,
} from './helpers.js'

describe('Lifecycle', () => {
  const { Lifecycle, Patch } = toolkit

  const spy = vi.fn<(method: string, sandbox: object, props?: object) => void>()

  class Root extends toolkit.Root {
    render(): Template {
      return (this.children[0] || null) as Template
    }
    onCreated() {
      spy('onCreated', this)
    }
    onAttached() {
      spy('onAttached', this)
    }
    onPropsReceived(props: object) {
      spy('onPropsReceived', this, props)
    }
    onUpdated(props: object) {
      spy('onUpdated', this, props)
    }
    onDestroyed() {
      spy('onDestroyed', this)
    }
    onDetached() {
      spy('onDetached', this)
    }
  }

  class Component extends toolkit.Component {
    render(): Template {
      return (this.children[0] || null) as Template
    }
    onCreated() {
      spy('onCreated', this)
    }
    onAttached() {
      spy('onAttached', this)
    }
    onPropsReceived(props: object) {
      spy('onPropsReceived', this, props)
    }
    onUpdated(props: object) {
      spy('onUpdated', this, props)
    }
    onDestroyed() {
      spy('onDestroyed', this)
    }
    onDetached() {
      spy('onDetached', this)
    }
  }

  class Subcomponent extends Component {
    hasOwnMethod(method: string) {
      return [
        'onCreated',
        'onAttached',
        'onPropsReceived',
        'onUpdated',
        'onDestroyed',
        'onDetached',
      ].includes(method)
    }
  }

  let root: Root

  const createRootWith = (template: unknown) => {
    root = createRootInstance(Root)
    return createFromTemplate(template, root)
  }

  const assertCalled = (expectedCalls: [string, ComponentClass][]) => {
    assert.equal(spy.mock.calls.length, expectedCalls.length)
    const actualCalls = spy.mock.calls
    for (let i = 0; i < expectedCalls.length; i++) {
      assert.equal(actualCalls[i][0], expectedCalls[i][0])
      assert.equal(actualCalls[i][1].constructor, expectedCalls[i][1])
    }
  }

  beforeEach(() => {
    spy.mockClear()
  })

  describe('on created', () => {
    const assertOnCreatedCalled = (...components: ComponentClass[]) => {
      assert.equal(spy.mock.calls.length, components.length)
      assertCalled(components.map(component => ['onCreated', component]))
    }

    describe('=> is called when: ', () => {
      it('creating root component', () => {
        // given
        const root = createRootInstance(Root)
        const patches = [Patch.initRootComponent(root)]

        // when
        Lifecycle.beforeUpdate(patches)

        // then
        assertOnCreatedCalled(Root)
      })

      it('adding component', () => {
        // given
        const root = createRootInstance(Root)
        const component = createFromTemplate([Component], root)
        const patches = [Patch.insertChild(component, 0, root)]

        // when
        Lifecycle.beforeUpdate(patches)

        // then
        assertOnCreatedCalled(Component)
      })

      it('adding nested components', () => {
        // given
        const root = createRootInstance(Root)
        const component = createFromTemplate([Component, [Subcomponent]], root)
        const patches = [Patch.insertChild(component, 0, root)]

        // when
        Lifecycle.beforeUpdate(patches)

        // then
        assertOnCreatedCalled(Component, Subcomponent)
      })

      it('adding element containing component', () => {
        // given
        const root = createRootInstance(Root)
        const element = createFromTemplate(['div', [Component]], root)
        const patches = [Patch.insertChild(element, 0, root)]

        // when
        Lifecycle.beforeUpdate(patches)

        // then
        assertOnCreatedCalled(Component)
      })

      it('adding element containing nested components', () => {
        // given
        const root = createRootInstance(Root)
        const element = createFromTemplate(
          ['div', [Component, ['span', [Subcomponent]]]],
          root,
        )
        const patches = [Patch.insertChild(element, 0, root)]

        // when
        Lifecycle.beforeUpdate(patches)

        // then
        assertOnCreatedCalled(Component, Subcomponent)
      })

      it('inserting component', () => {
        // given
        const root = createRootInstance(Root)
        const element = createFromTemplate(['div'], root)
        const component = createFromTemplate([Component], root)
        const patches = [Patch.insertChild(component, 0, element)]

        // when
        Lifecycle.beforeUpdate(patches)

        // then
        assertOnCreatedCalled(Component)
      })

      it('inserting nested components', () => {
        // given
        const root = createRootInstance(Root)
        const div = createFromTemplate(['div', ['span']], root)
        const span = div.children[0]
        const component = createFromTemplate([Component, [Subcomponent]], root)
        const patches = [Patch.insertChild(component, 1, span)]

        // when
        Lifecycle.beforeUpdate(patches)

        // then
        assertOnCreatedCalled(Component, Subcomponent)
      })

      it('inserting element containing component', () => {
        // given
        const root = createRootInstance(Root)
        const div = createFromTemplate(['div'], root)
        const span = createFromTemplate(['span', [Component]], root)
        const patches = [Patch.insertChild(span, 0, div)]

        // when
        Lifecycle.beforeUpdate(patches)

        // then
        assertOnCreatedCalled(Component)
      })

      it('inserting element containing nested components', () => {
        // given
        const root = createRootInstance(Root)
        const div = createFromTemplate(['div'], root)
        const span = createFromTemplate(
          ['span', [Component, [Subcomponent]]],
          root,
        )
        const patches = [Patch.insertChild(span, 0, div)]

        // when
        Lifecycle.beforeUpdate(patches)

        // then
        assertOnCreatedCalled(Component, Subcomponent)
      })
    })
  })

  describe('on attached', () => {
    const assertOnAttachedCalled = (...components: ComponentClass[]) => {
      assertCalled(components.map(component => ['onAttached', component]))
    }

    describe('=> is called when: ', () => {
      it('created root component', () => {
        // given
        const root = createRootInstance(Root)
        const patches = [Patch.initRootComponent(root)]

        // when
        Lifecycle.afterUpdate(patches)

        // then
        assertOnAttachedCalled(Root)
      })

      it('added component', () => {
        // given
        const root = createRootInstance(Root)
        const component = createFromTemplate([Component], root)
        const patches = [Patch.insertChild(component, 0, root)]

        // when
        Lifecycle.afterUpdate(patches)

        // then
        assertOnAttachedCalled(Component)
      })

      it('added nested components', () => {
        // given
        const root = createRootInstance(Root)
        const component = createFromTemplate([Component, [Subcomponent]], root)
        const patches = [Patch.insertChild(component, 0, root)]

        // when
        Lifecycle.afterUpdate(patches)

        // then
        assertOnAttachedCalled(Subcomponent, Component)
      })

      it('added element containing component', () => {
        // given
        const root = createRootInstance(Root)
        const element = createFromTemplate(['div', [Component]], root)
        const patches = [Patch.insertChild(element, 0, root)]

        // when
        Lifecycle.afterUpdate(patches)

        // then
        assertOnAttachedCalled(Component)
      })

      it('added element containing nested components', () => {
        // given
        const root = createRootInstance(Root)
        const element = createFromTemplate(
          ['div', [Component, ['span', [Subcomponent]]]],
          root,
        )
        const patches = [Patch.insertChild(element, 0, root)]

        // when
        Lifecycle.afterUpdate(patches)

        // then
        assertOnAttachedCalled(Subcomponent, Component)
      })

      it('inserted component', () => {
        // given
        const root = createRootInstance(Root)
        const element = createFromTemplate(['div'], root)
        const component = createFromTemplate([Component], element)
        const patches = [Patch.insertChild(component, 0, element)]

        // when
        Lifecycle.afterUpdate(patches)

        // then
        assertOnAttachedCalled(Component)
      })

      it('inserted nested components', () => {
        // given
        const root = createRootInstance(Root)
        const div = createFromTemplate(['div', ['span']], root)
        const span = div.children[0]
        const component = createFromTemplate([Component, [Subcomponent]], span)
        const patches = [Patch.insertChild(component, 1, span)]

        // when
        Lifecycle.afterUpdate(patches)

        // then
        assertOnAttachedCalled(Subcomponent, Component)
      })

      it('inserted element containing component', () => {
        // given
        const root = createRootInstance(Root)
        const div = createFromTemplate(['div'], root)
        const span = createFromTemplate(['span', [Component]], div)
        const patches = [Patch.insertChild(span, 0, div)]

        // when
        Lifecycle.afterUpdate(patches)

        // then
        assertOnAttachedCalled(Component)
      })

      it('inserted element containing nested components', () => {
        // given
        const root = createRootInstance(Root)
        const div = createFromTemplate(['div'], root)
        const span = createFromTemplate(
          ['span', [Component, [Subcomponent]]],
          div,
        )
        const patches = [Patch.insertChild(span, 0, div)]

        // when
        Lifecycle.afterUpdate(patches)

        // then
        assertOnAttachedCalled(Subcomponent, Component)
      })
    })
  })

  describe('on props received', () => {
    const assertOnPropsReceivedCalled = (component: AnyNode, props: object) => {
      assert.equal(spy.mock.calls.length, 1)
      assert.equal(spy.mock.calls[0][0], 'onPropsReceived')
      assert.equal(spy.mock.calls[0][1], component.sandbox)
      assert.deepEqual(spy.mock.calls[0][2], props)
    }

    it('=> is called before updating component', () => {
      // given
      const root = createRootInstance(Root)
      const props = {}
      const component = createFromTemplate([Component, props], root)

      const updatedProps = {
        test: 'test',
      }
      const description = toolkit.Template.describe([Component, updatedProps])!

      const patches = [Patch.updateNode(component, description)]

      // when
      Lifecycle.beforeUpdate(patches)

      // then
      assertOnPropsReceivedCalled(component, updatedProps)
    })
  })

  describe('on updated', () => {
    const assertOnUpdatedCalled = (component: AnyNode, prevProps: object) => {
      assert.equal(spy.mock.calls.length, 1)
      assert.equal(spy.mock.calls[0][0], 'onUpdated')
      assert.equal(spy.mock.calls[0][1], component.sandbox)
      assert.deepEqual(spy.mock.calls[0][2], prevProps)
    }

    it('=> is called after updating component', () => {
      // given
      const root = createRootInstance(Root)
      const props = {}
      const component = createFromTemplate([Component, props], root)

      const updatedProps = {
        foo: 'bar',
      }
      const description = toolkit.Template.describe([Component, updatedProps])!
      const patches = [Patch.updateNode(component, description)]

      // when
      Lifecycle.afterUpdate(patches)

      // then
      assertOnUpdatedCalled(component, props)
    })
  })

  describe('on destroyed', () => {
    const assertOnDestroyedCalled = (...components: ComponentClass[]) => {
      assertCalled(components.map(component => ['onDestroyed', component]))
    }

    describe('=> is called when: ', () => {
      it('removing component', () => {
        // given
        const component = createRootWith([Component])

        const patches = [Patch.removeChild(component, 0, root)]

        // when
        Lifecycle.beforeUpdate(patches)

        // then
        assertOnDestroyedCalled(Component)
      })

      it('removing nested components', () => {
        // given
        const component = createRootWith([Component, [Subcomponent]])
        const patches = [Patch.removeChild(component, 0, root)]

        // when
        Lifecycle.beforeUpdate(patches)

        // then
        assertOnDestroyedCalled(Component, Subcomponent)
      })

      it('removing element containing component', () => {
        // given
        const element = createRootWith(['div', [Component]])
        const patches = [Patch.removeChild(element, 0, root)]

        // when
        Lifecycle.beforeUpdate(patches)

        // then
        assertOnDestroyedCalled(Component)
      })

      it('removing element containing nested components', () => {
        // given
        const element = createRootWith(['div', [Component, [Subcomponent]]])
        const patches = [Patch.removeChild(element, 0, root)]

        // when
        Lifecycle.beforeUpdate(patches)

        // then
        assertOnDestroyedCalled(Component, Subcomponent)
      })

      describe('from element:', () => {
        it('removing component', () => {
          // given
          const element = createRootWith(['div', [Component]])
          const component = element.children[0]
          const patches = [Patch.removeChild(component, 0, element)]

          // when
          Lifecycle.beforeUpdate(patches)

          // then
          assertOnDestroyedCalled(Component)
        })

        it('removing nested components', () => {
          // given
          const element = createRootWith(['div', [Component, [Subcomponent]]])
          const component = element.children[0]
          const patches = [Patch.removeChild(component, 0, element)]

          // when
          Lifecycle.beforeUpdate(patches)

          // then
          assertOnDestroyedCalled(Component, Subcomponent)
        })

        it('removing element containing component', () => {
          // given
          const div = createRootWith(['div', ['span', [Component]]])
          const span = div.children[0]
          const patches = [Patch.removeChild(span, 0, div)]

          // when
          Lifecycle.beforeUpdate(patches)

          // then
          assertOnDestroyedCalled(Component)
        })

        it('removing element containing nested components', () => {
          // given
          const div = createRootWith([
            'div',
            ['span', [Component, ['span', [Subcomponent]]]],
          ])
          const span = div.children[0]
          const patches = [Patch.removeChild(span, 0, div)]

          // when
          Lifecycle.beforeUpdate(patches)

          // then
          assertOnDestroyedCalled(Component, Subcomponent)
        })
      })
    })

    it('cleans up bindings to services', () => {
      // given
      const disconnect = vi.fn()
      const Service = class {
        static connect() {
          return disconnect
        }
      }
      const root = createRootInstance(Root)
      const element = createFromTemplate(['div', [Component]], root)
      const component = element.children[0]
      const patches = [Patch.removeChild(component, 0, element)]

      // when
      component.connectTo(Service, {})
      Lifecycle.beforeUpdate(patches)

      // then
      expect(disconnect).toHaveBeenCalled()
      expect(disconnect).toHaveBeenCalledOnce()
    })
  })

  describe('on detached', () => {
    const assertOnDetachedCalled = (...components: ComponentClass[]) => {
      assertCalled(components.map(component => ['onDetached', component]))
    }

    describe('=> is called when: ', () => {
      it('removed component', () => {
        // given
        const root = createRootInstance(Root)
        const component = createFromTemplate([Component], root)
        const patches = [Patch.removeChild(component, 0, root)]

        // when
        Lifecycle.afterUpdate(patches)

        // then
        assertOnDetachedCalled(Component)
      })

      it('removed nested components', () => {
        // given
        const component = createRootWith([Component, [Subcomponent]])
        const patches = [Patch.removeChild(component, 0, root)]

        // when
        Lifecycle.afterUpdate(patches)

        // then
        assertOnDetachedCalled(Subcomponent, Component)
      })

      it('removed element containing component', () => {
        // given
        const element = createRootWith(['div', [Component]])
        const patches = [Patch.removeChild(element, 0, root)]

        // when
        Lifecycle.afterUpdate(patches)

        // then
        assertOnDetachedCalled(Component)
      })

      it('removed element containing nested components', () => {
        // given
        const element = createRootWith([
          'div',
          [Component, ['span', [Subcomponent]]],
        ])
        const patches = [Patch.removeChild(element, 0, root)]

        // when
        Lifecycle.afterUpdate(patches)

        // then
        assertOnDetachedCalled(Subcomponent, Component)
      })

      describe('from element:', () => {
        it('removed component', () => {
          // given
          const element = createRootWith(['div', [Component]])
          const component = element.children[0]
          const patches = [Patch.removeChild(component, 0, element)]

          // when
          Lifecycle.afterUpdate(patches)

          // then
          assertOnDetachedCalled(Component)
        })

        it('removed nested components', () => {
          // given
          const element = createRootWith(['div', [Component, [Subcomponent]]])
          const component = element.children[0]
          const patches = [Patch.removeChild(component, 0, element)]

          // when
          Lifecycle.afterUpdate(patches)

          // then
          assertOnDetachedCalled(Subcomponent, Component)
        })

        it('removed element containing component', () => {
          // given
          const div = createRootWith(['div', ['span', [Component]]])
          const span = div.children[0]
          const patches = [Patch.removeChild(span, 0, div)]

          // when
          Lifecycle.afterUpdate(patches)

          // then
          assertOnDetachedCalled(Component)
        })

        it('removed element containing nested components', () => {
          // given
          const div = createRootWith([
            'div',
            ['span', [Component, [Subcomponent]]],
          ])
          const span = div.children[0]
          const patches = [Patch.removeChild(span, 0, div)]

          // when
          Lifecycle.afterUpdate(patches)

          // then
          assertOnDetachedCalled(Subcomponent, Component)
        })
      })
    })
  })
})
