import type { ToolkitAPI } from './index.js'

declare global {
  /**
   * The Toolkit exposed to non-module scripts.
   */
  var toolkit: ToolkitAPI | undefined
}

export {}
