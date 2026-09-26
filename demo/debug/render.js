import toolkit from 'toolkit'

import Demo from '../demo/demo.js'
import logger from '../plugins/logger.js'

toolkit.configure({
  debug: true,
  plugins: [logger],
})
await toolkit.render(Demo, document.querySelector('#left'))
await toolkit.render(Demo, document.querySelector('#right'))
