import toolkit, { type Template } from '../src/index.js'
import { createRootInstance, createWebComponent } from './helpers.js'

describe('Dispatcher', () => {
  describe('=> Executes commands', () => {
    class Root extends toolkit.Root {}

    it('sets the state upon initialization', async () => {
      // given
      const root = createRootInstance(Root)

      // when
      await root.init()

      // then
      expect(root.state).toEqual({})
    })

    it('calls "set-state" on direct request', async () => {
      // given
      const root = await createWebComponent(Root)
      const state = { foo: 'bar' }

      // when
      vi.spyOn(root.commands, 'setState')
      void root.commands.setState(state)

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
      void root.commands.update(state)

      // then
      expect(root.commands.update).toHaveBeenCalled()
      expect(root.commands.update).toHaveBeenCalledWith(state)
    })
  })

  describe('Batches commands', () => {
    let renders = 0
    class Root extends toolkit.Root<object, { value: number; other?: number }> {
      getInitialState() {
        return { value: 1 }
      }
      render(): Template {
        renders++
        return ['span', String(this.props.value)]
      }
    }

    it('resolves with true once rendered', async () => {
      // given
      const root = await createWebComponent(Root)

      // when
      const result = root.commands.update({ value: 2 })

      // then
      expect(root.state).toEqual({ value: 1 })
      await expect(result).resolves.toBe(true)
      expect(root.state).toEqual({ value: 2 })
      expect(root.content!.ref.textContent).toBe('2')
    })

    it('renders the commands issued together in a single update', async () => {
      // given
      const root = await createWebComponent(Root)
      const rendered = renders

      // when
      const results = await Promise.all([
        root.commands.update({ value: 2 }),
        root.commands.update({ other: 3 }),
        root.commands.update({ value: 4 }),
      ])

      // then
      expect(results).toEqual([true, true, true])
      expect(renders).toBe(rendered + 1)
      expect(root.state).toEqual({ value: 4, other: 3 })
      expect(root.content!.ref.textContent).toBe('4')
    })

    it('resolves with false when the root is destroyed', async () => {
      // given
      const root = await createWebComponent(Root)

      // when
      const queued = root.commands.update({ value: 2 })
      root.destroy()

      // then
      await expect(queued).resolves.toBe(false)
      await expect(root.commands.update({ value: 3 })).resolves.toBe(false)
      expect(root.state).toEqual({ value: 1 })
    })
  })

  describe('Queues commands', () => {
    it('queues "update" from lifecycle method', async () => {
      // given
      class Root extends toolkit.Root {
        onCreated() {
          void this.commands.update({
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
            void this.commands.update({ step: this.props.step + 1 })
          }
        }
      }
      const root = await createWebComponent(Root)

      // when
      await root.commands.update({ step: 1 })

      // then
      expect(root.state).toEqual({ step: 3 })
    })

    it('stops executing commands queued in an endless cycle', async () => {
      // given
      const queued: Promise<boolean>[] = []
      class Root extends toolkit.Root<
        object,
        { endless: boolean; count: number }
      > {
        getInitialState() {
          return { endless: false, count: 0 }
        }
        onUpdated() {
          if (this.props.endless) {
            queued.push(this.commands.update({ count: this.props.count + 1 }))
          }
        }
      }
      const root = await createWebComponent(Root)

      // when
      const result = root.commands.update({ endless: true })

      // then
      await expect(result).resolves.toBe(true)
      const results = await Promise.allSettled(queued)
      // the commands of the update exceeding the limit reject
      expect(results.map(({ status }) => status)).toEqual([
        'fulfilled',
        'fulfilled',
        'fulfilled',
        'rejected',
      ])
      expect((results.at(-1) as PromiseRejectedResult).reason).toEqual(
        new Error('Too many cycles updating state in lifecycle methods!'),
      )
      expect(root.dispatcher.queue).toEqual([])
      expect(root.state).toEqual({ endless: true, count: 3 })
    })

    it('resolves the queued commands not executed when an update fails', async () => {
      // given
      let skipped: Promise<boolean> | undefined
      class Root extends toolkit.Root<object, { value: number }> {
        getInitialState() {
          return { value: 1 }
        }
        onUpdated() {
          if (this.props.value === 2) {
            skipped = this.commands.update({ value: 3 })
            throw new Error('Failed!')
          }
        }
      }
      const root = await createWebComponent(Root)

      // when
      const failing = root.commands.update({ value: 2 })

      // then
      await expect(failing).rejects.toThrow('Failed!')
      await expect(skipped).resolves.toBe(false)
      expect(root.state).toEqual({ value: 2 })
    })

    it('keeps the state when rendering it fails', async () => {
      // given
      class Root extends toolkit.Root<object, { value: number }> {
        getInitialState() {
          return { value: 1 }
        }
        render(): Template {
          if (this.props.value < 0) {
            throw new Error('Negative value')
          }
          return ['span', String(this.props.value)]
        }
      }
      const root = await createWebComponent(Root)

      // when
      const update = root.commands.update({ value: -1 })

      // then
      await expect(update).rejects.toThrow('Negative value')
      expect(root.state).toEqual({ value: 1 })

      // when
      await root.commands.update({ value: 2 })

      // then
      expect(root.state).toEqual({ value: 2 })
      expect(root.content!.ref.textContent).toBe('2')
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
      await expect(root.commands.update({ fail: true })).rejects.toThrow(
        'Failed!',
      )

      // when
      const result = root.commands.update({ fail: false })

      // then
      await expect(result).resolves.toBe(true)
      expect(root.state).toEqual({ fail: false })
    })
  })
})
