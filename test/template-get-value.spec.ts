import type { ElementDescription } from '../src/core/description.js'
import Template from '../src/core/template.js'

describe('Template', () => {
  describe('get class name', () => {
    it('supports strings', () => {
      // given
      const value = 'foo bar'
      const emptyString = ''

      // then
      assert.equal(Template.getClassName(value), value)
      assert.equal(Template.getClassName(emptyString), emptyString)
    })

    it('supports objects', () => {
      // given
      const value = {
        used: true,
        'not-used': false,
        ignored: null,
        disregarded: undefined,
      }

      // when
      const className = Template.getClassName(value)

      // then
      assert.equal(className, 'used')
    })

    it('supports arrays', () => {
      // given
      const value = [
        'nobody',
        null,
        'expects',
        undefined,
        'spanish',
        false,
        'inquisition',
      ]

      // when
      const className = Template.getClassName(value)

      // then
      assert.equal(className, 'nobody expects spanish inquisition')
    })

    it('supports array / array nesting', () => {
      // given
      const value = ['first', ['second', ['third']], 'fourth']

      // when
      const className = Template.getClassName(value)

      // then
      assert.equal(className, 'first second third fourth')
    })

    it('supports array / object nesting', () => {
      // given
      const value = ['first', { second: true }, 'third']

      // when
      const className = Template.getClassName(value)

      // then
      assert.equal(className, 'first second third')
    })

    it('ignores null', () => {
      assert.equal(Template.getClassName(null), '')
    })

    it('ignores undefined', () => {
      assert.equal(Template.getClassName(undefined), '')
    })

    it('rejects symbols', () => {
      assert.throws(() => Template.getClassName(Symbol.for('invalid')))
    })

    it('rejects functions', () => {
      assert.throws(() => Template.getClassName(() => {}))
    })
  })

  describe('get style', () => {
    it('supports strings', () => {
      // given
      const value = {
        color: 'black',
        display: 'inherit',
      }

      // when
      const style = Template.getStyle(value)

      // then
      assert.deepEqual(style, value)
    })

    it('supports an empty string', () => {
      // given
      const value = {
        content: '',
      }

      // when
      const style = Template.getStyle(value)

      // then
      assert.deepEqual(style, {
        content: "''",
      })
    })

    it('supports numbers', () => {
      // given
      const value = {
        gridColumn: 2,
        gridRow: 3,
      }

      // when
      const style = Template.getStyle(value)

      // then
      assert.deepEqual(style, {
        gridColumn: '2',
        gridRow: '3',
      })
    })

    it('supports arrays', () => {
      // given
      const value = {
        width: [100, '%'],
        height: [50, 'vh'],
      }

      // when
      const style = Template.getStyle(value)

      // then
      assert.deepEqual(style, {
        width: '100%',
        height: '50vh',
      })
    })

    it('rejects functions', () => {
      assert.throws(() => Template.getStyle({ color: () => {} }))
    })

    it('rejects symbols', () => {
      assert.throws(() => Template.getStyle({ height: Symbol.for('100px') }))
    })

    it('ignores null', () => {
      assert.equal(Template.getStyle({ width: null }), null)
    })

    it('ignores false', () => {
      assert.equal(Template.getStyle({ display: false }), null)
    })

    it('ignores undefined', () => {
      assert.deepEqual(
        Template.getStyle({
          margin: 'auto',
          color: undefined,
        }),
        {
          margin: 'auto',
        },
      )
    })

    it('keeps and warns on unknown properties', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        // given
        const value = {
          unknown: true,
          time: 420,
        }

        // when
        const style = Template.getStyle(value)

        // then
        assert.deepEqual(style, { time: '420' })
        expect(console.warn).toHaveBeenCalledTimes(2)
      } finally {
        vi.mocked(console.warn).mockRestore()
      }
    })

    it('keeps unknown style properties', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        // given
        const value = {
          color: 'green',
          time: 420,
        }

        // when
        const style = Template.getStyle(value)

        // then
        assert.deepEqual(style, { color: 'green', time: '420' })
        expect(console.warn).toHaveBeenCalledOnce()
      } finally {
        vi.mocked(console.warn).mockRestore()
      }
    })

    it('rejects unknown functions list', () => {
      // given
      const style = {
        background: {},
      }

      // then
      assert.throws(() => Template.getStyle(style))
    })

    it('handles only valid transform functions', () => {
      // given
      const transform = {
        translate: [10, 'px'],
        rotate: undefined,
        skew: null,
        scale: false,
      }

      // when
      const value = Template.getStyle({ transform })

      // then
      assert.deepEqual(value, { transform: 'translate(10px)' })
    })

    it('skips the filter functions without values', () => {
      // given
      const filter = {
        contrast: [10],
        hueRotate: '',
        opacity: undefined,
        sepia: null,
        blur: '4px',
      }

      // when
      const value = Template.getStyle({ filter })

      // then
      assert.deepEqual(value, { filter: 'contrast(10) blur(4px)' })
    })

    it('converts the filter functions to their CSS names', () => {
      // given
      const filter = {
        dropShadow: '2px 2px red',
        hueRotate: '90deg',
        url: '#shadow',
      }

      // when
      const value = Template.getStyle({ filter })

      // then
      assert.deepEqual(value, {
        filter: 'drop-shadow(2px 2px red) hue-rotate(90deg) url(#shadow)',
      })
      assert(CSS.supports('filter', value!.filter))
    })

    it('warns about unsupported filter functions', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        // when
        const value = Template.getStyle({ filter: { glow: 1, blur: '2px' } })

        // then
        assert.deepEqual(value, { filter: 'glow(1) blur(2px)' })
        expect(console.warn).toHaveBeenCalledWith(
          'Unsupported filter functions: glow(1) blur(2px)',
        )
      } finally {
        vi.mocked(console.warn).mockRestore()
      }
    })

    it('names the transform functions as CSS does', () => {
      // given
      const transform = { translateX: '10px', rotate3d: '1, 1, 1, 45deg' }

      // when
      const value = Template.getStyle({ transform })

      // then
      assert.deepEqual(value, {
        transform: 'translateX(10px) rotate3d(1, 1, 1, 45deg)',
      })
      assert(CSS.supports('transform', value!.transform))
    })
  })

  describe('get listeners', () => {
    it('handles known events', () => {
      // given
      const onClick = () => {}
      const onDoubleClick = () => {}
      const onChange = () => {}

      const props = {
        onClick,
        onDoubleClick,
        onChange,
      }

      // when
      const element = { name: 'div' } as ElementDescription
      Template.assignPropsToElement(props, element)

      // then
      assert.deepEqual<object>(element, { name: 'div', listeners: props })
    })

    it('adds and warns on unknown events', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        // given
        const onMyEvent = () => {}
        const unknownListeners = {
          onMyEvent,
        }

        // when
        const element = { name: 'div' } as ElementDescription
        Template.assignPropsToElement(unknownListeners, element)

        // then
        assert.deepEqual<object>(element, {
          name: 'div',
          listeners: unknownListeners,
        })
        expect(console.warn).toHaveBeenCalledOnce()
        expect(console.warn).toHaveBeenCalledWith(
          'The "onMyEvent" listener is not supported on "div" elements.',
        )
      } finally {
        vi.mocked(console.warn).mockRestore()
      }
    })

    it('supports functions', () => {
      // given
      const value = () => {}

      // when
      const listener = Template.getListener(value, 'onClick')

      // then
      assert.equal(listener, value)
    })

    it('ignores null', () => {
      // given
      const value = null

      // when
      const listener = Template.getListener(value, 'onClick')

      // then
      assert.equal(listener, null)
    })

    it('ignores false', () => {
      // given
      const value = false

      // when
      const listener = Template.getListener(value, 'onClick')

      // then
      assert.equal(listener, null)
    })

    it('ignores undefined', () => {
      // given
      const value = undefined

      // when
      const listener = Template.getListener(value, 'onClick')

      // then
      assert.equal(listener, null)
    })

    it('rejects anything else', () => {
      assert.throws(() =>
        Template.getListener(Symbol.for('invalid'), 'onClick'),
      )
      assert.throws(() => Template.getListener(5, 'onClick'))
      assert.throws(() => Template.getListener(true, 'onClick'))
      assert.throws(() => Template.getListener([], 'onClick'))
      assert.throws(() => Template.getListener({}, 'onClick'))
    })
  })

  describe('get attribute value', () => {
    it('supports strings', () => {
      assert.equal(Template.getAttributeValue('inherit'), 'inherit')
      assert.equal(Template.getAttributeValue('none'), 'none')
    })

    it('supports an empty string', () => {
      assert.equal(Template.getAttributeValue(''), '')
    })

    it('handles true as an empty string', () => {
      assert.equal(Template.getAttributeValue(true), '')
    })

    it('supports numbers', () => {
      assert.equal(Template.getAttributeValue(10), '10')
    })

    it('supports arrays', () => {
      assert.equal(Template.getAttributeValue([100, 'px']), '100px')
      assert.equal(Template.getAttributeValue([2, 'rem']), '2rem')
      assert.equal(Template.getAttributeValue([90, 'deg']), '90deg')
      assert.equal(Template.getAttributeValue([]), '')
    })

    it('ignores null', () => {
      assert.equal(Template.getAttributeValue(null), null)
    })

    it('ignores false', () => {
      assert.equal(Template.getAttributeValue(false), null)
    })

    it('ignores undefined', () => {
      assert.equal(Template.getAttributeValue(undefined), null)
    })
  })

  describe('get dataset', () => {
    it('supports strings', () => {
      // given
      const props = {
        value: 'test',
      }

      // when
      const dataset = Template.getDataset(props)

      // then
      assert.deepEqual(dataset, props)
    })

    it('supports an empty string', () => {
      // given
      const props = {
        value: '',
      }

      // when
      const dataset = Template.getDataset(props)

      // then
      assert.deepEqual(dataset, props)
    })

    it('handles true as an empty string', () => {
      // given
      const props = {
        value: true,
      }

      // when
      const dataset = Template.getDataset(props)

      // then
      assert.deepEqual(dataset, {
        value: '',
      })
    })

    it('supports numbers', () => {
      // given
      const props = {
        width: 800,
        height: 600,
      }

      // when
      const dataset = Template.getDataset(props)

      // then
      assert.deepEqual(dataset, {
        width: '800',
        height: '600',
      })
    })

    it('supports arrays', () => {
      // given
      const props = {
        value: [90, 'deg'],
      }

      // when
      const dataset = Template.getDataset(props)

      // then
      assert.deepEqual(dataset, {
        value: '90deg',
      })
    })

    it('ignores false', () => {
      // given
      const props = {
        value: false,
      }

      // when
      const dataset = Template.getDataset(props)

      // then
      assert.equal(dataset, null)
    })

    it('ignores null', () => {
      // given
      const props = {
        value: null,
      }

      // when
      const dataset = Template.getDataset(props)

      // then
      assert.equal(dataset, null)
    })

    it('ignores undefined', () => {
      // given
      const props = {
        value: undefined,
      }

      // when
      const dataset = Template.getDataset(props)

      // then
      assert.equal(dataset, undefined)
    })

    it('rejects symbols', () => {
      // given
      const props = {
        value: Symbol('value'),
      }

      // then
      assert.throws(() => Template.getDataset(props))
    })

    it('rejects functions', () => {
      // given
      const props = {
        value: () => {},
      }

      // then
      assert.throws(() => Template.getDataset(props))
    })

    it('rejects objects', () => {
      // given
      const props = {
        value: {},
      }

      // then
      assert.throws(() => Template.getDataset(props))
    })
  })

  describe('get properties', () => {
    it('supports strings', () => {
      // given
      const props = {
        value: 'value',
      }

      // when
      const properties = Template.getProperties(props)

      // then
      assert.deepEqual(properties, props)
    })

    it('supports objects', () => {
      // given
      const props = {
        value: {
          foo: 'bar',
        },
      }

      // when
      const properties = Template.getProperties(props)

      // then
      assert.deepEqual(properties, props)
    })

    it('supports arrays', () => {
      // given
      const props = {
        value: [1, 2, 3],
      }

      // when
      const properties = Template.getProperties(props)

      // then
      assert.deepEqual(properties, props)
    })

    it('supports booleans', () => {
      // given
      const props = {
        foo: true,
        bar: false,
      }

      // when
      const properties = Template.getProperties(props)

      // then
      assert.deepEqual(properties, props)
    })

    it('supports symbols', () => {
      // given
      const props = {
        value: Symbol('value'),
      }

      // when
      const properties = Template.getProperties(props)

      // then
      assert.deepEqual(properties, props)
    })

    it('supports null', () => {
      // given
      const props = {
        value: null,
      }

      // when
      const properties = Template.getProperties(props)

      // then
      assert.deepEqual(properties, props)
    })

    it('supports undefined', () => {
      // given
      const props = {
        value: undefined,
      }

      // when
      const properties = Template.getProperties(props)

      // then
      assert.deepEqual(properties, props)
    })
  })

  describe('get custom listeners', () => {
    it('supports functions', () => {
      // given
      const myListener = () => {}
      const otherListener = () => {}
      const props = {
        on: {
          'my-event': myListener,
          'other-listener': otherListener,
        },
      }

      // when
      const element = {} as ElementDescription
      Template.assignPropsToElement(props, element)

      // then
      assert.deepEqual<object>(element, {
        custom: {
          listeners: props.on,
        },
      })
    })

    it('ignores null', () => {
      // given
      const props = {
        on: {
          'my-event': null,
        },
      }

      // when
      const element = {} as ElementDescription
      Template.assignPropsToElement(props, element)

      // then
      assert.deepEqual<object>(element, {})
    })

    it('ignores false', () => {
      // given
      const props = {
        on: {
          'some-event': false,
        },
      }

      // when
      const element = {} as ElementDescription
      Template.assignPropsToElement(props, element)

      // then
      assert.deepEqual<object>(element, {})
    })

    it('ignores undefined', () => {
      // given
      const props = {
        on: {
          'another-event': undefined,
        },
      }

      // when
      const element = {} as ElementDescription
      Template.assignPropsToElement(props, element)

      // then
      assert.deepEqual<object>(element, {})
    })

    it('rejects anything else', () => {
      // given
      const createCustomListener = (value: unknown) =>
        Template.assignPropsToElement(
          {
            on: {
              'another-event': value,
            },
          },
          {} as ElementDescription,
        )

      // then
      assert.throws(() => createCustomListener(666))
      assert.throws(() => createCustomListener(Symbol('')))
      assert.throws(() => createCustomListener('xxx'))
      assert.throws(() => createCustomListener(true))
    })
  })

  describe('get custom attributes', () => {
    it('supports strings', () => {
      // given
      const props = {
        value: 'test',
      }

      // when
      const dataset = Template.getCustomAttributes(props)

      // then
      assert.deepEqual(dataset, props)
    })

    it('supports an empty string', () => {
      // given
      const props = {
        value: '',
      }

      // when
      const dataset = Template.getCustomAttributes(props)

      // then
      assert.deepEqual(dataset, props)
    })

    it('handles true as an empty string', () => {
      // given
      const props = {
        value: true,
      }

      // when
      const dataset = Template.getCustomAttributes(props)

      // then
      assert.deepEqual(dataset, {
        value: '',
      })
    })

    it('supports numbers', () => {
      // given
      const props = {
        width: 800,
        height: 600,
      }

      // when
      const dataset = Template.getCustomAttributes(props)

      // then
      assert.deepEqual(dataset, {
        width: '800',
        height: '600',
      })
    })

    it('supports arrays', () => {
      // given
      const props = {
        value: [90, 'deg'],
      }

      // when
      const dataset = Template.getCustomAttributes(props)

      // then
      assert.deepEqual(dataset, {
        value: '90deg',
      })
    })

    it('ignores false', () => {
      // given
      const props = {
        value: false,
      }

      // when
      const dataset = Template.getCustomAttributes(props)

      // then
      assert.equal(dataset, null)
    })

    it('ignores null', () => {
      // given
      const props = {
        value: null,
      }

      // when
      const dataset = Template.getCustomAttributes(props)

      // then
      assert.equal(dataset, null)
    })

    it('ignores undefined', () => {
      // given
      const props = {
        value: undefined,
      }

      // when
      const dataset = Template.getCustomAttributes(props)

      // then
      assert.equal(dataset, null)
    })

    it('rejects symbols', () => {
      // given
      const props = {
        value: Symbol('symbol'),
      }

      // then
      assert.throws(() => Template.getCustomAttributes(props))
    })

    it('rejects functions', () => {
      // given
      const props = {
        value: () => {},
      }

      // then
      assert.throws(() => Template.getCustomAttributes(props))
    })

    it('rejects objects', () => {
      // given
      const props = {
        value: {
          foo: 'bar',
        },
      }

      // then
      assert.throws(() => Template.getCustomAttributes(props))
    })
  })
})
