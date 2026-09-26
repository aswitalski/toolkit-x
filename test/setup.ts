import toolkit from '../src/index.js'

toolkit.assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

await toolkit.configure({
  debug: true,
})
