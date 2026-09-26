import toolkit, { type Template } from '../../src/index.js'

describe('Attributes', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('section')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('sets custom attribute for WebComponent', async () => {
    const elementName = 'custom-element'

    class CustomElement extends toolkit.WebComponent {
      static elementName = elementName

      render(): Template {
        return ['main']
      }
    }

    const customElement = await toolkit.render(CustomElement, container, {
      attrs: {
        convertedToLowecase: 'yes',
      },
    })

    const element = container.querySelector('*')!
    assert.equal(customElement.ref, element)
    assert.equal('yes', element.getAttribute('converted-to-lowecase'))
  })
})
