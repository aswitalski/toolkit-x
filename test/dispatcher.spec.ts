import toolkit from '../src/index.js'
import { createRootInstance, createWebComponent } from './helpers.js'

describe('Dispatcher', () => {
  describe('=> Executes commands', () => {
    class Root extends toolkit.Root {}

    it('calls "set-state" upon initialization', async () => {
      // given
      const root = createRootInstance(Root)

      vi.spyOn(root.commands, 'setState')

      // when
      await root.init()

      // then
      expect(root.commands.setState).toHaveBeenCalled()
    })

    it('calls "set-state" on direct request', async () => {
      // given
      const root = await createWebComponent(Root)
      const state = { foo: 'bar' }

      // when
      vi.spyOn(root.commands, 'setState')
      root.commands.setState(state)

      // then
      expect(root.commands.setState).toHaveBeenCalled()
      expect(root.commands.setState).toHaveBeenCalledWith(state)
    })

    it('calls "update" on direct request', async () => {
      // given
      const root = await createWebComponent(Root)
      const state = { foo: 'bar' }

      // when
      vi.spyOn(root.commands, 'update')
      root.commands.update(state)

      // then
      expect(root.commands.update).toHaveBeenCalled()
      expect(root.commands.update).toHaveBeenCalledWith(state)
    })
  })

  describe('Queues commands', () => {
    it('queues "update" from lifecycle method', async () => {
      // given
      class Root extends toolkit.Root {
        onCreated() {
          this.commands.update({
            number: 19,
          })
        }
      }
      const root = createRootInstance(Root)
      vi.spyOn(root.commands, 'update')

      // when
      const initPromise = root.init()

      // then
      expect(root.commands.update).not.toHaveBeenCalled()

      // when
      await initPromise

      // then
      expect(root.commands.update).toHaveBeenCalled()
      expect(root.commands.update).toHaveBeenCalledWith({
        number: 19,
      })
    })
  })
})
