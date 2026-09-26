import type { ToolkitAPI } from './index.js'

declare global {
  /**
   * The optional lazy-module-loader, resolving components by module id.
   */
  var loader:
    | {
        get(id: string): unknown
        path(id: string): string
        preload(id: string): Promise<unknown>
      }
    | undefined

  /**
   * Global namespace exposing the Toolkit to non-module scripts.
   */
  var opr: { Toolkit?: ToolkitAPI } | undefined

  interface Window {
    loadToolkit?(configureLoader?: () => void): Promise<ToolkitAPI>
  }
}

export {}
