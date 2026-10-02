import type { ComponentElement } from '../../src/core/custom-element.js'
import toolkit, { type Template } from '../../src/index.js'

describe('Update errors', () => {
  let container: HTMLElement

  let counter = 0

  beforeEach(() => {
    container = document.createElement('section')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  const renderList = async (Item: typeof Component, items: string[]) => {
    class List extends toolkit.WebComponent<object, { items: string[] }> {
      static elementName = `update-errors-list-${counter++}`

      getInitialState() {
        return { items }
      }

      render(): Template {
        return [
          'ul',
          ...this.props.items.map((name): Template => [
            Item,
            { key: name, name },
          ]),
        ]
      }
    }
    return toolkit.render(List, container)
  }

  class Component extends toolkit.Component<{ name: string }> {
    render(): Template {
      return ['li', this.props.name]
    }
  }

  const getErrors = async (promise: Promise<unknown>) => {
    try {
      await promise
    } catch (error) {
      return error instanceof AggregateError
        ? error.errors.map((cause: Error) => cause.message)
        : [(error as Error).message]
    }
    return []
  }

  it('calls the other hooks after a hook throws, rejecting with its error', async () => {
    // given
    const attached: string[] = []
    class Item extends Component {
      onAttached() {
        attached.push(this.props.name)
        if (this.props.name === 'b') {
          throw new Error('Failed to attach b')
        }
      }
    }
    const list = await renderList(Item, [])

    // when
    const errors = await getErrors(
      list.commands.update({ items: ['a', 'b', 'c'] }),
    )

    // then
    assert.deepEqual(errors, ['Failed to attach b'])
    assert.deepEqual(attached.sort(), ['a', 'b', 'c'])
    assert.equal(list.shadow!.querySelector('ul')!.textContent, 'abc')
  })

  it('applies the patches after a hook throws before them', async () => {
    // given
    const updated = vi.fn()
    class Item extends Component {
      onPropsReceived() {
        throw new Error('Failed to receive props')
      }
      onUpdated() {
        updated()
      }
    }
    class Label extends toolkit.WebComponent<object, { name: string }> {
      static elementName = `update-errors-label-${counter++}`

      getInitialState() {
        return { name: 'a' }
      }

      render(): Template {
        return ['ul', [Item, { name: this.props.name }]]
      }
    }
    const label = await toolkit.render(Label, container)

    // when
    const errors = await getErrors(label.commands.update({ name: 'b' }))

    // then
    assert.deepEqual(errors, ['Failed to receive props'])
    assert.equal(label.shadow!.querySelector('li')!.textContent, 'b')
    expect(updated).toHaveBeenCalledOnce()
  })

  it('calls the hooks of the other removed components', async () => {
    // given
    const detached: string[] = []
    class Item extends Component {
      onDetached() {
        detached.push(this.props.name)
        if (this.props.name === 'a') {
          throw new Error('Failed to detach a')
        }
      }
    }
    const list = await renderList(Item, ['a', 'b', 'c'])

    // when
    const errors = await getErrors(list.commands.update({ items: ['c'] }))

    // then
    assert.deepEqual(errors, ['Failed to detach a'])
    assert.deepEqual(detached.sort(), ['a', 'b'])
    assert.equal(list.shadow!.querySelector('ul')!.textContent, 'c')
  })

  it('rejects with the errors of all the throwing hooks', async () => {
    // given
    class Item extends Component {
      onAttached() {
        throw new Error(`Failed to attach ${this.props.name}`)
      }
    }
    const list = await renderList(Item, [])

    // when
    const errors = await getErrors(list.commands.update({ items: ['a', 'b'] }))

    // then
    assert.deepEqual(errors.sort(), [
      'Failed to attach a',
      'Failed to attach b',
    ])
  })

  it('applies the other patches after a patch throws', async () => {
    // given
    class Form extends toolkit.WebComponent<
      object,
      { value: string; text: string }
    > {
      static elementName = `update-errors-form-${counter++}`

      getInitialState() {
        return { value: '', text: 'a' }
      }

      render(): Template {
        return [
          'form',
          // a file input throws when its value is set to other than empty
          ['input', { type: 'file', properties: { value: this.props.value } }],
          ['p', this.props.text],
        ]
      }
    }
    const form = await toolkit.render(Form, container)

    // when
    const errors = await getErrors(
      form.commands.update({ value: 'file.txt', text: 'b' }),
    )

    // then
    assert.equal(errors.length, 1)
    assert.equal(form.shadow!.querySelector('p')!.textContent, 'b')
  })

  it('destroys all the components after a hook throws', async () => {
    // given
    const detached: string[] = []
    class Item extends Component {
      onDetached() {
        detached.push(this.props.name)
        throw new Error(`Failed to detach ${this.props.name}`)
      }
    }
    const list = await renderList(Item, ['a', 'b'])
    const element = list.ref as ComponentElement

    // when
    const destroy = () => element.destroy()

    // then
    expect(destroy).toThrow(AggregateError)
    assert.deepEqual(detached.sort(), ['a', 'b'])
    assert.equal(element.$root, null)
  })
})
