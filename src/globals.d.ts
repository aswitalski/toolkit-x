import type { ToolkitAPI } from './index.js'

declare global {
  /**
   * Global namespace exposing the Toolkit to non-module scripts.
   */
  var opr: { Toolkit?: ToolkitAPI } | undefined
}

export {}
