import type { toolkit } from './core/toolkit.js'

declare global {
  /**
   * The optional lazy-module-loader, resolving components by module id.
   */
  var loader:
    | {
        get(id: string): any
        path(id: string): string
        preload(id: string): Promise<any>
      }
    | undefined

  /**
   * Global namespace exposing the Toolkit to non-module scripts.
   */
  var opr: { Toolkit?: typeof toolkit } | undefined

  interface Window {
    loadToolkit?(configureLoader?: () => void): Promise<typeof toolkit>
  }
}

export {}
