import toolkit, { type Template } from '../../src/index.js'
import { type VirtualElement } from '../../src/core/nodes.js'

/* A pseudo-random number generator, repeating the cases for a seed. */
const createRandom = (seed: number) => () => {
  seed = (seed * 1103515245 + 12345) % 2 ** 31
  return seed / 2 ** 31
}

const shuffle = <T>(items: T[], random: () => number) => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

describe('Keyed children', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('section')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  class List extends toolkit.WebComponent<
    object,
    { keys: string[]; version: number }
  > {
    getInitialState() {
      return { keys: [], version: 0 }
    }

    render(): Template {
      const { keys, version } = this.props
      return [
        'ul',
        ...keys.map(key => ['li', { key }, `${key}:${version}`] as const),
      ]
    }
  }

  it('renders the keys in order after random updates', async () => {
    // given
    const list = await toolkit.render(List, container)
    const ul = list.content as VirtualElement
    const random = createRandom(1)
    let keys: string[] = []
    let version = 0
    let counter = 0

    for (let update = 0; update < 300; update++) {
      const kept = keys.filter(() => random() < 0.8)
      const added = Array.from(
        { length: Math.floor(random() * 4) },
        () => `k${counter++}`,
      )
      const nextKeys =
        random() < 0.5
          ? [...kept, ...added]
          : shuffle([...kept, ...added], random)
      if (random() < 0.3) {
        version++
      }
      const elements = new Map(
        (ul.children ?? []).map(node => [node.key, node.ref]),
      )

      // when
      list.commands.update({ keys: nextKeys, version })

      // then
      const rendered = [...ul.ref.children]
      assert.deepEqual(
        rendered.map(element => element.textContent),
        nextKeys.map(key => `${key}:${version}`),
        `update ${update}`,
      )
      assert.deepEqual(
        (ul.children ?? []).map(node => node.key),
        nextKeys,
        `update ${update}`,
      )
      for (const key of kept) {
        const index = nextKeys.indexOf(key)
        assert.equal(rendered[index], elements.get(key), `update ${update}`)
      }
      keys = nextKeys
    }
  })
})
