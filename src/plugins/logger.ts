import type { WebComponent } from '../core/nodes.js'
import type { PluginManifest } from '../core/plugins.js'
import type { Update } from '../core/renderer.js'

const RENDER_TIME = 'Render time'
const title = (update: Update) =>
  `==> ${(update.root.constructor as typeof WebComponent).displayName} <==`

/* eslint-disable no-console */

const Logger: PluginManifest = {
  name: 'logger',
  permissions: ['listen-for-updates'],

  onBeforeUpdate(update: Update) {
    console.group(title(update))
    console.log('Command:', update.command.name)
    console.time(RENDER_TIME)
  },

  onAfterUpdate(update: Update) {
    if (update.patches!.length) {
      console.log('%cPatches:', 'color: hsl(54, 70%, 45%)', update.patches)
    } else {
      console.log('%c=> No update', 'color: #07a707')
    }
    console.timeEnd(RENDER_TIME)
    console.log('--------------------------------')
    console.groupEnd()
  },
}

/* eslint-enable no-console */

export default Logger
