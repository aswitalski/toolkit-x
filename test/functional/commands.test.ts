import toolkit, { type CommandsAPI } from '../../src/index.js'

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

  const createWebComponent = async (
    commands: CommandsAPI | CommandsAPI[] | (() => CommandsAPI),
  ) => {
    class CommandsComponent extends toolkit.WebComponent {
      static elementName = `commands-component-${counter++}`

      static getCommands() {
        return typeof commands === 'function' ? commands() : commands
      }
    }

    return await toolkit.render(CommandsComponent, container)
  }

  it('uses static getCommands() method', async () => {
    // given
    const getCommands = vi.fn().mockReturnValue({
      doNothing: () => (state: object) => state,
    })

    // when
    await createWebComponent(getCommands)

    // then
    expect(getCommands).toHaveBeenCalled()
  })

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
      typeof (component.commands as CommandsAPI).doNothing,
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
})
