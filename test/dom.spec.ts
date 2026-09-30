import { ElementDescription } from '../src/core/description.js'
import DOM from '../src/core/dom.js'

describe('DOM', () => {
  describe('style properties', () => {
    it('sets and removes a custom property', () => {
      // given
      const element = document.createElement('div')

      // when
      DOM.setStyleProperty(element, '--size', '10px')

      // then
      assert.equal(element.style.getPropertyValue('--size'), '10px')

      // when
      DOM.removeStyleProperty(element, '--size')

      // then
      assert.equal(element.style.getPropertyValue('--size'), '')
    })

    it('sets and removes a style property', () => {
      // given
      const element = document.createElement('div')

      // when
      DOM.setStyleProperty(element, 'marginTop', '10px')

      // then
      assert.equal(element.style.marginTop, '10px')

      // when
      DOM.removeStyleProperty(element, 'marginTop')

      // then
      assert.equal(element.style.marginTop, '')
    })
  })

  describe('attributes and listeners', () => {
    it('maps names unless custom', () => {
      // given
      const element = document.createElement('div')
      const listener = vi.fn()

      // when
      DOM.setAttribute(element, 'ariaLabel', 'mapped', false)
      DOM.setAttribute(element, 'ariaLabel', 'custom', true)
      DOM.addListener(element, 'onDoubleClick', listener, false)
      DOM.addListener(element, 'custom-event', listener, true)
      element.dispatchEvent(new Event('dblclick'))
      element.dispatchEvent(new Event('custom-event'))

      // then
      assert.equal(element.getAttribute('aria-label'), 'mapped')
      assert.equal(element.getAttribute('ariaLabel'), 'custom')
      expect(listener).toHaveBeenCalledTimes(2)
    })
  })

  describe('create element', () => {
    it('sets custom attributes and listeners as given', () => {
      // given
      const description = new ElementDescription('div')
      const listener = vi.fn()
      description.style = { '--size': '10px' }
      description.custom = {
        attrs: { 'data-custom': 'value' },
        listeners: { 'custom-event': listener },
      }

      // when
      const element = DOM.createElement(description)
      element.dispatchEvent(new Event('custom-event'))

      // then
      assert.equal(element.style.getPropertyValue('--size'), '10px')
      assert.equal(element.getAttribute('data-custom'), 'value')
      expect(listener).toHaveBeenCalledOnce()
    })
  })
})
