import toolkit from 'toolkit'

import logger from '../src/plugins/logger.js'
import Demo from './src/demo.js'

/* The release mode runs the demo against the bundled ESM build. */
const debug = import.meta.env.MODE !== 'release'

await toolkit.configure({
  debug,
  plugins: debug ? [logger] : [],
})
await toolkit.render(Demo, document.querySelector('#left')!)
await toolkit.render(Demo, document.querySelector('#right')!)
