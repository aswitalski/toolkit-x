import toolkit from 'toolkit'

import Demo from '../demo/demo.js'

toolkit.configure({
  debug: false,
})
await toolkit.render(Demo, document.querySelector('#left'))
await toolkit.render(Demo, document.querySelector('#right'))
