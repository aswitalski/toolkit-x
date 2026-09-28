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

    it('executes commands queued by queued commands', async () => {
      // given
      class Root extends toolkit.Root<object, { step: number }> {
        getInitialState() {
          return { step: 0 }
        }
        onUpdated() {
          if (this.props.step === 1 || this.props.step === 2) {
            this.commands.update({ step: this.props.step + 1 })
          }
        }
      }
      const root = await createWebComponent(Root)

      // when
      root.commands.update({ step: 1 })
      await new Promise(resolve => setTimeout(resolve))

      // then
      expect(root.state).toEqual({ step: 3 })
    })

    it('stops executing commands queued in an endless cycle', async () => {
      // given
      class Root extends toolkit.Root<
        object,
        { endless: boolean; count: number }
      > {
        getInitialState() {
          return { endless: false, count: 0 }
        }
        onUpdated() {
          if (this.props.endless) {
            this.commands.update({ count: this.props.count + 1 })
          }
        }
      }
      const root = await createWebComponent(Root)
      const { dispatcher } = root
      dispatcher.queueIncoming()
      void root.commands.update({ endless: true })
      dispatcher.executeIncoming()
      const tasks = dispatcher.queue.splice(0)

      // when
      const flush = () => dispatcher.flush(tasks, root)

      // then
      expect(flush).toThrow(
        'Too many cycles updating state in lifecycle methods!',
      )
      expect(dispatcher.queue).toEqual([])
    })

    it('executes commands after a lifecycle method has thrown', async () => {
      // given
      class Root extends toolkit.Root<object, { fail: boolean }> {
        getInitialState() {
          return { fail: false }
        }
        onUpdated() {
          if (this.props.fail) {
            throw new Error('Failed!')
          }
        }
      }
      const root = await createWebComponent(Root)
      expect(() => root.commands.update({ fail: true })).toThrow('Failed!')

      // when
      const result = root.commands.update({ fail: false })

      // then
      expect(result).toBe(true)
      expect(root.state).toEqual({ fail: false })
    })
  })
})
