import toolkit, { type CommandsAPI, type Template } from '../../src/index.js'

describe('Commands API', () => {
  let container: HTMLElement

  let counter = 0

  beforeEach(() => {
    container = document.createElement('section')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  const createWebComponent = async (commands: CommandsAPI | CommandsAPI[]) => {
    class CommandsComponent extends toolkit.WebComponent {
      static elementName = `commands-component-${counter++}`

      static commands = commands
    }

    return await toolkit.render(CommandsComponent, container)
  }

  it('creates default commands object', async () => {
    // when
    const component = await createWebComponent({})

    // then
    assert.equal(typeof component.commands, 'object')
    assert.equal(typeof component.commands.replace, 'function')
    assert.equal(typeof component.commands.update, 'function')
  })

  it('creates custom commands object', async () => {
    // when
    const component = await createWebComponent({
      doNothing() {},
    })

    // then
    assert.equal(typeof component.commands, 'object')
    assert.equal(typeof component.commands.replace, 'function')
    assert.equal(typeof component.commands.update, 'function')
    assert.equal(
      typeof (component.commands as Record<string, unknown>).doNothing,
      'function',
    )
  })

  it('detects a conflict with core commands', async () => {
    // given
    let exception: Error | null = null

    // when
    try {
      await createWebComponent({
        update() {},
      })
    } catch (e) {
      exception = e as Error
    }

    // then
    assert(exception)
    assert.equal(exception.message, 'The "update" command is already defined!')
  })

  it('detects a conflict between custom commands', async () => {
    // given
    let exception: Error | null = null

    // when
    try {
      await createWebComponent([
        {
          doNothing() {},
        },
        {
          doNothing() {},
        },
      ])
    } catch (e) {
      exception = e as Error
    }

    // then
    assert(exception)
    assert.equal(
      exception.message,
      'The "doNothing" command is already defined!',
    )
  })

  describe('=> Changes the state through a draft', () => {
    interface State {
      count: number
      items: { id: number; done: boolean }[]
      tags: Set<string>
    }

    const TodoCommands = {
      increment() {
        this.count += 1
      },
      add(id: number) {
        this.items.push({ id, done: false })
      },
      toggle(id: number) {
        const item = this.items.find(item => item.id === id)
        if (item) {
          item.done = !item.done
        }
      },
      tag(name: string) {
        this.tags.add(name)
      },
      fail() {
        this.count = -1
        throw new Error('Failed!')
      },
      async load() {
        this.count = 1
        await Promise.resolve()
        this.count = 2
      },
    } satisfies CommandsAPI<State>

    let renders = 0

    class Todos extends toolkit.WebComponent<
      object,
      State,
      typeof TodoCommands
    > {
      static elementName = `commands-component-${counter++}`

      static commands = TodoCommands

      getInitialState(): State {
        return {
          count: 0,
          items: [
            { id: 1, done: false },
            { id: 2, done: false },
          ],
          tags: new Set(),
        }
      }

      render(): Template {
        renders++
        return ['span', String(this.props.count)]
      }
    }

    const renderTodos = async () =>
      (await toolkit.render(Todos, container)) as Todos

    it('sets the next state', async () => {
      // given
      const component = await renderTodos()
      const prevState = component.state!

      // when
      await component.commands.increment()

      // then
      expect(component.state).toEqual({ ...prevState, count: 1 })
      expect(prevState.count).toBe(0)
      expect(component.shadow!.querySelector('span')!.textContent).toBe('1')
    })

    it('calls the commands with their arguments', async () => {
      // given
      const component = await renderTodos()

      // when
      await Promise.all([
        component.commands.add(3),
        component.commands.toggle(3),
        component.commands.tag('home'),
      ])

      // then
      expect(component.state!.items).toEqual([
        { id: 1, done: false },
        { id: 2, done: false },
        { id: 3, done: true },
      ])
      expect([...component.state!.tags]).toEqual(['home'])
    })

    it('shares the unchanged parts of the state', async () => {
      // given
      const component = await renderTodos()
      const prevState = component.state!

      // when
      await component.commands.toggle(2)

      // then
      const { items, tags } = component.state!
      expect(items).not.toBe(prevState.items)
      expect(items[0]).toBe(prevState.items[0])
      expect(items[1]).toEqual({ id: 2, done: true })
      expect(prevState.items[1].done).toBe(false)
      expect(tags).toBe(prevState.tags)
    })

    it('keeps the state when nothing changes', async () => {
      // given
      const component = await renderTodos()
      const prevState = component.state
      const rendered = renders

      // when
      await component.commands.toggle(10)

      // then
      expect(component.state).toBe(prevState)
      expect(renders).toBe(rendered)
    })

    it('rejects async commands', async () => {
      // given
      const component = await renderTodos()
      const prevState = component.state

      // when
      const result = component.commands.load()

      // then
      await expect(result).rejects.toThrow(
        'The "load" command must be synchronous!',
      )
      expect(component.state).toBe(prevState)
    })

    it('keeps the state when a command throws', async () => {
      // given
      const component = await renderTodos()
      const prevState = component.state

      // when
      const result = component.commands.fail()

      // then
      await expect(result).rejects.toThrow('Failed!')
      expect(component.state).toBe(prevState)
      expect(prevState!.count).toBe(0)
    })
  })

  it('executes commands after a child component with hooks is removed', async () => {
    // given
    class Child extends toolkit.Component {
      onDestroyed() {}
      onDetached() {}
      render(): Template {
        return ['span']
      }
    }
    class CommandsComponent extends toolkit.WebComponent<
      object,
      { count: number }
    > {
      static elementName = `commands-component-${counter++}`

      getInitialState() {
        return { count: 0 }
      }

      render(): Template {
        return [
          'div',
          this.props.count === 0 && [Child],
          String(this.props.count),
        ]
      }
    }
    const component = await toolkit.render(CommandsComponent, container)
    await component.commands.update({ count: 1 })

    // when
    await component.commands.update({ count: 2 })

    // then
    assert.equal(component.shadow!.querySelector('div')!.textContent, '2')
  })

  it('ignores commands after the root with hooks in a child is destroyed', async () => {
    // given
    class Child extends toolkit.Component {
      onDestroyed() {}
      onDetached() {}
      render(): Template {
        return ['span']
      }
    }
    class CommandsComponent extends toolkit.WebComponent<
      object,
      { count: number }
    > {
      static elementName = `commands-component-${counter++}`

      getInitialState() {
        return { count: 0 }
      }

      render(): Template {
        return ['div', [Child], String(this.props.count)]
      }
    }
    const component = await toolkit.render(CommandsComponent, container)

    // when
    component.ref.remove()
    // the removed custom element destroys the root after 50 ms
    await new Promise(resolve => setTimeout(resolve, 100))
    const result = await component.commands.update({ count: 1 })

    // then
    assert.isFalse(result)
  })
})
