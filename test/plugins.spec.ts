import type { ComponentElement } from '../src/core/custom-element.js'
import toolkit, { type Template } from '../src/index.js'

describe('Plugins', () => {
  const plugin = {
    name: 'plugin',
    install: vi.fn().mockReturnValue(toolkit.noop),
  }

  describe('=> Install', () => {
    it('installs plugin on the root component', async () => {
      // given
      toolkit.reset()
      await toolkit.configure({
        debug: true,
        plugins: [plugin],
      })

      class SomeRoot extends toolkit.Root {
        render(): Template {
          return ['main']
        }
      }

      // when
      await toolkit.render(SomeRoot, document.body)

      // then
      expect(plugin.install).toHaveBeenCalledOnce()
    })
  })

  describe('=> Install through the custom element', () => {
    const createRoot = async (elementName: string) => {
      toolkit.reset()
      await toolkit.configure({
        debug: true,
      })

      class SomeRoot extends toolkit.Root {
        static elementName = elementName

        render(): Template {
          return ['main']
        }
      }

      return toolkit.render(SomeRoot, document.body)
    }

    it('installs a plugin manifest', async () => {
      // given
      const root = await createRoot('plugin-manifest-root')
      const element = root.ref as ComponentElement
      const manifest = {
        name: 'manifest',
        install: vi.fn().mockReturnValue(toolkit.noop),
      }

      // when
      element.install(manifest)

      // then
      expect(manifest.install).toHaveBeenCalledWith(root)
    })

    it('installs and registers a plugin instance', async () => {
      // given
      const root = await createRoot('plugin-instance-root')
      const element = root.ref as ComponentElement
      const install = vi.fn().mockReturnValue(toolkit.noop)
      const plugin = new toolkit.Plugins.Plugin({
        name: 'instance',
        install,
      })

      // when
      element.install(plugin)

      // then
      expect(install).toHaveBeenCalledWith(root)
      assert(root.plugins!.registry.isRegistered('instance'))
    })

    it('uninstalls a plugin once and allows installing it again', async () => {
      // given
      const root = await createRoot('plugin-reinstall-root')
      const element = root.ref as ComponentElement
      const uninstall = vi.fn()
      const install = vi.fn().mockReturnValue(uninstall)
      const plugin = new toolkit.Plugins.Plugin({
        name: 'reinstalled',
        install,
      })
      element.install(plugin)

      // when
      element.uninstall(plugin)
      element.uninstall(plugin)
      element.install(plugin)

      // then
      expect(uninstall).toHaveBeenCalledOnce()
      expect(install).toHaveBeenCalledTimes(2)
      assert(root.plugins!.registry.isRegistered('reinstalled'))
    })
  })

  describe('=> Uninstall', () => {
    it('uninstalls plugins of a root destroyed before being mounted', async () => {
      // given
      const uninstall = vi.fn()
      toolkit.reset()
      await toolkit.configure({
        debug: true,
        plugins: [
          {
            name: 'plugin',
            install: () => uninstall,
          },
        ],
      })

      class SomeRoot extends toolkit.Root {
        render(): Template {
          return ['main']
        }
      }
      const root = await toolkit.createRoot(SomeRoot)

      // when
      root.destroy()
      root.destroy()

      // then
      expect(uninstall).toHaveBeenCalledOnce()
      assert.equal(root.plugins, null)
    })
  })
})
