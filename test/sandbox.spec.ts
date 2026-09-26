import toolkit, { type Component } from '../src/index.js'
import { createComponent, createFromTemplate, createRoot } from './helpers.js'

describe('Sandbox', () => {
  const Sandbox = toolkit.Sandbox

  /* The sandbox with the component methods and arbitrary properties. */
  const create = <T extends object>(component: T) =>
    Sandbox.create(component as unknown as Component) as ReturnType<
      typeof Sandbox.create
    > &
      Omit<T, 'children' | 'props'> &
      Record<string, unknown>

  class TestComponent extends toolkit.Component {
    render() {
      return null
    }
  }

  describe('create sandbox', () => {
    it('returns a sandbox containing own methods', () => {
      // given
      class SomeComponent extends toolkit.Component {
        a(): unknown {
          return this
        }
        b() {
          return 'b'
        }
        render() {
          return null
        }
      }
      const component = createFromTemplate<SomeComponent>([SomeComponent])

      // when
      const sandbox = create(component)

      // then
      assert.equal(typeof sandbox, 'object')
      assert.equal(sandbox.a, sandbox.a)
      assert.equal(sandbox.a(), sandbox)
      assert.equal(sandbox.b(), 'b')
    })

    it('returns a sandbox containing inherited methods', () => {
      // given
      class ParentComponent extends toolkit.Component {
        render() {
          return null
        }
        a(): unknown {
          return this
        }
        b() {
          return 666
        }
      }

      class SomeComponent extends ParentComponent {
        c() {
          return 'c'
        }
      }
      const component = createFromTemplate<SomeComponent>([SomeComponent])

      // when
      const sandbox = create(component)

      // then
      assert.equal(typeof sandbox, 'object')
      assert.equal(sandbox.a, sandbox.a)
      assert.equal(sandbox.a(), sandbox)
      assert.equal(sandbox.b, sandbox.b)
      assert.equal(sandbox.b(), 666)
      assert.equal(sandbox.c(), 'c')
    })

    it('does not return built-in component properties', () => {
      // given
      const component = createFromTemplate<Component>([TestComponent])

      // when
      const sandbox = create(component)

      // then
      assert.equal(sandbox.constructor, TestComponent)
      assert.equal(sandbox.appendChild, undefined)
      assert.equal(sandbox.nodeType, undefined)
      assert.equal(sandbox.onUpdated, undefined)
      assert.equal(sandbox.unknown, undefined)
    })

    it('allows to get component children', () => {
      // given
      const component = createFromTemplate<Component>([TestComponent])
      const children: unknown[] = []

      // when
      const sandbox = create(component)
      sandbox.children = children

      // then
      assert.deepEqual(sandbox.children, children)
    })

    it('allows to get root state as props', () => {
      const initialState = {
        counter: 0,
      }

      // given
      const root = createRoot()
      root.state = initialState

      // when
      const sandbox = create(root)

      // then
      assert.equal(sandbox.props, initialState)

      // when
      const updatedState = {
        counter: 1,
      }
      sandbox.props = updatedState

      // then
      assert.equal(sandbox.props, updatedState)
    })

    it('allows to get component props', () => {
      // given
      const component = createComponent()
      const props = {
        foo: 'bar',
      }

      // when
      const sandbox = create(component)
      sandbox.props = props

      // then
      assert.equal(sandbox.props, props)
    })

    it('allows to get root-specific properties', () => {
      // given
      const root = createRoot()

      // when
      const sandbox = create(root)

      // then
      assert.equal(sandbox.commands, root.commands)
    })

    it('allows to register services', () => {
      // given
      const component = createComponent()

      // when
      const sandbox = create(component)

      // then
      assert.equal(typeof sandbox.connectTo, 'function')
    })

    it('ignores unknown properties', () => {
      // given
      const component = createComponent()

      // when
      const sandbox = create(component)

      // then
      assert.throws(() => {
        sandbox.unknown = 'unknown'
      }, TypeError)
      assert.equal(sandbox.unknown, undefined)
    })

    it('returns a reference to the component', () => {
      // given
      const component = createComponent()

      // when
      const sandbox = create(component)

      // then
      assert.equal(sandbox.$component, component)
    })

    it('returns component property', () => {
      // given
      class ComponentWithProperty extends toolkit.Component {
        get property() {
          return 'value'
        }
        render() {
          return null
        }
      }
      const component = createFromTemplate<ComponentWithProperty>([
        ComponentWithProperty,
      ])

      // when
      const sandbox = create(component)

      // then
      assert.equal(sandbox.property, 'value')
    })
  })
})
