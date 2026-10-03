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
    assert.equal(typeof component.commands.setState, 'function')
    assert.equal(typeof component.commands.update, 'function')
  })

  it('creates custom commands object', async () => {
    // when
    const component = await createWebComponent({
      doNothing: () => (state: object) => state,
    })

    // then
    assert.equal(typeof component.commands, 'object')
    assert.equal(typeof component.commands.setState, 'function')
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
        update: () => (state: object) => state,
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
          doNothing: () => (state: object) => state,
        },
        {
          doNothing: () => (state: object) => state,
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
