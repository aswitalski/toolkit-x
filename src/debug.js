import './release.js'

/*
 * Kept for backwards compatibility: Toolkit modules are now imported
 * statically, so this only runs the optional loader configuration.
 */
window.loadToolkit = async configureLoader => {
  if (configureLoader) {
    configureLoader()
  }
  return opr.Toolkit
}
