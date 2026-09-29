import toolkit from '../src/index.js'
import Template from '../src/core/template.js'
import VirtualDOM from '../src/core/virtual-dom.js'
import { type AnyNode, createRootInstance } from './helpers.js'

describe('Virtual Element => Attach DOM', () => {
  class Root extends toolkit.Root {
    render(): Template {
      return null
    }
  }

  class Component extends toolkit.Component {
    render(): Template {
      return (this.children[0] || null) as Template
    }
  }

  class Subcomponent extends toolkit.Component {
    render(): Template {
      return (this.children[0] || null) as Template
    }
  }

  const createElement = (
    name: string,
    props: object = {},
    content: string | unknown[] = [],
  ) => {
    const template =
      typeof content === 'string'
        ? [name, props, content]
        : [name, props, ...content]
    const description = Template.describe(template)
    const root = createRootInstance(Root)
    return VirtualDOM.createFromDescription(description, root) as AnyNode
  }

  describe('=> create element', () => {
    it('supports empty elements', () => {
      // when
      const element = createElement('span')

      // then
      assert.equal(element.description.name, 'span')
      assert(element.ref instanceof Element)
      assert.equal(element.ref.tagName, 'SPAN')
      assert(!element.ref.textContent)
    })

    it('supports text elements', () => {
      // when
      const element = createElement('span', {}, 'Text')

      // then
      assert.equal(element.description.name, 'span')
      assert(element.ref instanceof Element)
      assert.equal(element.ref.tagName, 'SPAN')
      assert.equal(element.ref.textContent, 'Text')
    })

    it('supports style attribute', () => {
      // when
      const element = createElement('span', {
        style: {
          color: 'red',
        },
      })

      // then
      assert(element.ref instanceof Element)
      assert.equal(element.ref.tagName, 'SPAN')
      assert.equal(element.ref.style.length, 1)
      assert.deepEqual(element.ref.style.color, 'red')
    })

    it('supports adding event listeners', () => {
      // given
      const onClick = () => {}
      const onChange = () => {}

      // when
      const element = createElement('span', { onClick, onChange }, 'Text')

      // then
      assert(element.ref instanceof Element)
      assert.equal(element.ref.tagName, 'SPAN')
      assert.equal(element.ref.textContent, 'Text')
    })
  })

  describe('=> create element', () => {
    const createFromTemplate = (template: unknown) => {
      const root = createRootInstance(Root)
      return VirtualDOM.createFromDescription(
        Template.describe(template),
        root,
      ) as AnyNode
    }

    it('creates a single element', () => {
      // given
      const element = createElement('div')

      // then
      assert.equal(element.description.name, 'div')
      assert.equal(element.children, undefined)
      assert.equal(element.ref.tagName, 'DIV')
      assert.equal(element.ref.children.length, 0)
    })

    it('creates two nested elements', () => {
      // when
      const element = createFromTemplate(['div', ['span']])

      // then
      assert.equal(element.description.name, 'div')
      assert.equal(element.ref.tagName, 'DIV')

      assert.equal(element.children[0].description.name, 'span')
      assert.equal(element.ref.children[0].tagName, 'SPAN')
    })

    it('creates three nested elements', () => {
      // when
      const element = createFromTemplate(['div', ['span', ['a']]])

      // then
      assert.equal(element.description.name, 'div')
      assert.equal(element.ref.tagName, 'DIV')

      const span = element.children[0]
      assert.equal(element.ref.children[0], span.ref)
      assert.equal(span.description.name, 'span')
      assert.equal(span.ref.tagName, 'SPAN')

      const link = span.children[0]
      assert.equal(span.ref.children[0], link.ref)
      assert.equal(link.description.name, 'a')
      assert.equal(link.ref.tagName, 'A')
    })

    it('supports component present within the tree', () => {
      // when
      const element = createFromTemplate(['div', [Component, ['span']]])

      // then
      assert.equal(element.description.name, 'div')
      assert.equal(element.ref.tagName, 'DIV')

      const component = element.children[0]
      assert.equal(component.constructor, Component)

      const span = component.content
      assert.equal(span.description.name, 'span')
      assert.equal(span.ref.tagName, 'SPAN')
    })

    it('supports nested components present within the tree', () => {
      // when
      const element = createFromTemplate([
        'div',
        [Component, [Subcomponent, ['span']]],
      ])

      // then
      assert.equal(element.description.name, 'div')
      assert.equal(element.ref.tagName, 'DIV')

      const component = element.children[0]
      assert.equal(component.constructor, Component)
      assert(component instanceof toolkit.Component)

      const subcomponent = component.content
      assert.equal(subcomponent.constructor, Subcomponent)

      const span = subcomponent.content
      assert.equal(span.description.name, 'span')
      assert.equal(span.ref.tagName, 'SPAN')
    })

    it('supports component with no children', () => {
      // when
      const element = createFromTemplate([
        'div',
        [Component, ['span', [Subcomponent]]],
      ])

      // then
      assert.equal(element.description.name, 'div')
      assert.equal(element.ref.tagName, 'DIV')

      const component = element.children[0]
      assert.equal(component.constructor, Component)
      assert(component.isComponent())

      const span = component.content
      assert.equal(span.description.name, 'span')
      assert.equal(span.ref.tagName, 'SPAN')

      const subcomponent = span.children[0]
      assert.equal(subcomponent.constructor, Subcomponent)
      assert(subcomponent.content.isComment())
    })

    it('creates properties', () => {
      // when
      const element = createFromTemplate([
        'video',
        {
          properties: {
            muted: true,
          },
        },
      ])

      // then
      assert.equal(element.description.name, 'video')
      assert.equal(element.ref.tagName, 'VIDEO')

      assert.equal((element.ref as HTMLVideoElement).muted, true)
    })

    describe('creates a comment node', () => {
      it('for a component with no child', () => {
        // when
        const component = createFromTemplate([Component])

        // then
        assert(component.content)
        assert(component.placeholder.description.text.includes(Component.name))
      })

      it('for nested components with no child element', () => {
        // given
        const component = createFromTemplate([
          Component,
          [Component, [Subcomponent]],
        ])

        // then
        assert(component.content)
        assert(
          component.placeholder.description.text.includes(Subcomponent.name),
        )
      })
    })
  })
})
