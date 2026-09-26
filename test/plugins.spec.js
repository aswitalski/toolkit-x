describe('Plugins', () => {
  const plugin = {
    name: 'plugin',
    install: vi.fn().mockReturnValue(opr.Toolkit.noop),
  }

  describe('=> Install', () => {
    it('installs plugin on the root component', async () => {
      // given
      opr.Toolkit.reset()
      await opr.Toolkit.configure({
        debug: true,
        plugins: [plugin],
      })

      class SomeRoot extends opr.Toolkit.Root {
        render() {
          return ['main']
        }
      }

      // when
      await opr.Toolkit.render(SomeRoot, document.body)

      // then
      expect(plugin.install).toHaveBeenCalledOnce()
    })
  })

  describe('=> Install through the custom element', () => {
    const createRoot = async elementName => {
      opr.Toolkit.reset()
      await opr.Toolkit.configure({
        debug: true,
      })

      class SomeRoot extends opr.Toolkit.Root {
        static elementName = elementName

        render() {
          return ['main']
        }
      }

      return opr.Toolkit.render(SomeRoot, document.body)
    }

    it('installs a plugin manifest', async () => {
      // given
      const root = await createRoot('plugin-manifest-root')
      const manifest = {
        name: 'manifest',
        install: vi.fn().mockReturnValue(opr.Toolkit.noop),
      }

      // when
      root.ref.install(manifest)

      // then
      expect(manifest.install).toHaveBeenCalledWith(root)
    })

    it('installs and registers a plugin instance', async () => {
      // given
      const root = await createRoot('plugin-instance-root')
      const install = vi.fn().mockReturnValue(opr.Toolkit.noop)
      const plugin = new opr.Toolkit.Plugins.Plugin({
        name: 'instance',
        install,
      })

      // when
      root.ref.install(plugin)

      // then
      expect(install).toHaveBeenCalledWith(root)
      assert(root.plugins.registry.isRegistered('instance'))
    })
  })
})
