import toolkit, { type ComponentClass, type Template } from '../src/index.js'

describe('Root update', () => {
  const range = (length: number) => Array.from({ length }, (_, i) => i)

  class Item extends toolkit.Component<{ label: string }> {
    render(): Template {
      return ['li', this.props.label]
    }
  }

  class List extends toolkit.WebComponent<object, { keys: number[] }> {
    getInitialState() {
      return { keys: range(1000) }
    }

    render(): Template {
      return [
        'ul',
        ...this.props.keys.map(
          key => [Item, { key, label: `Item ${key}` }] as const,
        ),
      ]
    }
  }

  /* Nested divs with three children each, showing the counter in leaves. */
  const tree = (
    depth: number,
    counter: number,
    showsCounter: (path: string) => boolean,
    path = '',
  ): Template => {
    if (depth === 0) {
      return ['span', showsCounter(path) ? String(counter) : path]
    }
    return [
      'div',
      ...[0, 1, 2].map(i => tree(depth - 1, counter, showsCounter, path + i)),
    ]
  }

  /* A tree of 3280 nodes, with 2187 leaves. */
  const createTree = (showsCounter: (path: string) => boolean) =>
    class Tree extends toolkit.WebComponent<object, { counter: number }> {
      getInitialState() {
        return { counter: 0 }
      }

      render(): Template {
        return tree(7, this.props.counter, showsCounter)
      }
    }

  const render = async (RootClass: ComponentClass) => {
    const container = document.createElement('main')
    document.body.appendChild(container)
    return toolkit.render(RootClass, container)
  }

  beforeAll(() => {
    // measured as in production, without frozen descriptions
    toolkit.reset()
    toolkit.configure({ debug: false })
  })

  test('reverses 1000 keyed items', async ({ bench }) => {
    const list = await render(List)
    const keys = range(1000)
    const reversed = [...keys].reverse()
    let isReversed = false

    await bench('reverse', () => {
      isReversed = !isReversed
      return list.commands.update({ keys: isReversed ? reversed : keys })
    }).run()
  })

  test('rotates 1000 keyed items by one', async ({ bench }) => {
    const list = await render(List)
    let keys = range(1000)

    await bench('rotate', () => {
      keys = [...keys.slice(1), keys[0]]
      return list.commands.update({ keys })
    }).run()
  })

  test('updates one leaf of a tree of 3280 nodes', async ({ bench }) => {
    const root = await render(createTree(path => path === '0000000'))
    let counter = 0

    await bench('leaf', () =>
      root.commands.update({ counter: ++counter }),
    ).run()
  })

  test('updates 1458 leaves of a tree of 3280 nodes', async ({ bench }) => {
    const root = await render(createTree(path => !path.startsWith('1')))
    let counter = 0

    await bench('leaves', () =>
      root.commands.update({ counter: ++counter }),
    ).run()
  })

  test('recreates 1000 components', async ({ bench }) => {
    const list = await render(List)
    const keys = range(1000)
    let isEmpty = false

    await bench('recreate', () => {
      isEmpty = !isEmpty
      return list.commands.update({ keys: isEmpty ? [] : keys })
    }).run()
  })
})
