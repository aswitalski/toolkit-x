import toolkit from './index.js'
import './release.js'

/*
 * Kept for backwards compatibility: Toolkit modules are now imported
 * statically, so this only runs the optional loader configuration.
 */
window.loadToolkit = async configureLoader => {
  configureLoader?.()
  return toolkit
}
