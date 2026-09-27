import toolkit, { type Template } from '../../src/index.js'

describe('Children', () => {
  let container: HTMLElement

  let counter = 0

  beforeEach(() => {
    container = document.createElement('section')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('reorders keyed children next to a text node', async () => {
    // given
    class List extends toolkit.WebComponent<object, { items: string[] }> {
      static elementName = `children-list-${counter++}`

      getInitialState() {
        return { items: ['a', 'b', 'c', 'd'] }
      }

      render(): Template {
        return [
          'ul',
          'Items:',
          ...this.props.items.map((item): Template => [
            'li',
            { key: item },
            item,
          ]),
        ]
      }
    }
    const list = await toolkit.render(List, container)

    // when
    list.commands.update({ items: ['d', 'a', 'c', 'b'] })

    // then
    const ul = list.shadow!.querySelector('ul')!
    assert.equal(ul.textContent, 'Items:dacb')
  })
})
