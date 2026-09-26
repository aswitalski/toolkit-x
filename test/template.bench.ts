import toolkit from '../src/index.js'

describe('Template.describe(template)', () => {
  const { Template } = toolkit

  const onClick = () => {}

  class Component extends toolkit.Component {}
  class Subcomponent extends toolkit.Component {}

  let i = 0

  test('describes elements', async ({ bench }) => {
    await bench('elements', () => {
      i++
      Template.describe(['main'])
      Template.describe(['section', ['paragraph']])
      Template.describe(['div', { class: 'foo bar', id: `element-${i}` }])
      Template.describe(['input', { onClick }])
    }).run()
  })

  test('describes components', async ({ bench }) => {
    await bench('components', () => {
      i++
      Template.describe([Component])
      Template.describe([Component, [Subcomponent]])
      Template.describe([Component, { foo: 'bar', id: `component-${i}` }])
    }).run()
  })
})
