import toolkit, { type Template } from '../src/index.js'
import { type AnyElement, createFromTemplate } from './helpers.js'

describe('Patch element => apply', () => {
  const { Patch } = toolkit

  /* Reads a property set directly on the DOM element. */
  const getProperty = (element: AnyElement, name: string): unknown =>
    Reflect.get(element.ref, name)

  const createElement = (name: string) => createFromTemplate<AnyElement>([name])

  it('adds attribute', () => {
    // given
    const element = createFromTemplate<AnyElement>(['input'])

    // when
    Patch.apply(Patch.setAttribute('name', 'value', element, false))
    Patch.apply(Patch.setAttribute('noValidate', '', element, false))
    Patch.apply(Patch.setAttribute('minLength', '100px', element, false))

    // then
    assert.equal(element.ref.getAttribute('name'), 'value')
    assert.equal(element.ref.getAttribute('novalidate'), '')
    assert.equal(element.ref.getAttribute('minlength'), '100px')
  })

  it('replaces attribute', () => {
    // given
    const element = createFromTemplate<AnyElement>([
      'input',
      {
        name: 'name',
        minLength: '50px',
      },
    ])

    assert.deepEqual(element.description.attrs, {
      name: 'name',
      minLength: '50px',
    })
    assert.equal(element.ref.getAttribute('name'), 'name')
    assert.equal(element.ref.getAttribute('minlength'), '50px')

    // when
    Patch.apply(Patch.setAttribute('name', 'value', element, false))
    Patch.apply(Patch.setAttribute('minLength', '100px', element, false))

    // then
    assert.equal(element.ref.getAttribute('name'), 'value')
    assert.equal(element.ref.getAttribute('minlength'), '100px')
  })

  it('removes attribute', () => {
    // given
    const element = createFromTemplate<AnyElement>([
      'input',
      {
        name: 'name',
        minLength: '50px',
      },
    ])

    assert.deepEqual(element.description.attrs, {
      name: 'name',
      minLength: '50px',
    })
    assert.equal(element.ref.getAttribute('name'), 'name')
    assert.equal(element.ref.getAttribute('minlength'), '50px')

    // when
    Patch.apply(Patch.removeAttribute('name', element, false))
    Patch.apply(Patch.removeAttribute('minLength', element, false))

    // then
    assert.equal(element.ref.attributes.length, 0)
  })

  it('adds data attributes', () => {
    // given
    const element = createFromTemplate<AnyElement>(['div'])

    // when
    Patch.apply(Patch.setDataAttribute('id', '10', element))
    Patch.apply(Patch.setDataAttribute('customAttribute', 'true', element))

    // then
    assert.equal(Object.keys(element.ref.dataset).length, 2)
    assert.equal(element.ref.dataset.id, '10')
    assert.equal(element.ref.dataset.customAttribute, 'true')

    assert.equal(element.ref.getAttribute('data-id'), '10')
    assert.equal(element.ref.getAttribute('data-custom-attribute'), 'true')
  })

  it('replaces data attributes', () => {
    // given
    const element = createFromTemplate<AnyElement>([
      'div',
      {
        dataset: {
          toolkitId: 15,
          someName: 'Some Name',
        },
      },
    ])

    // when
    Patch.apply(Patch.setDataAttribute('toolkitId', '23', element))

    assert.equal(Object.keys(element.ref.dataset).length, 2)
    assert.equal(element.ref.dataset.toolkitId, '23')
    assert.equal(element.ref.dataset.someName, 'Some Name')

    assert.equal(element.ref.getAttribute('data-toolkit-id'), '23')
    assert.equal(element.ref.getAttribute('data-some-name'), 'Some Name')

    // when
    Patch.apply(Patch.setDataAttribute('toolkitId', '23', element))
    Patch.apply(Patch.setDataAttribute('someName', 'Other Name', element))

    // then
    assert.equal(Object.keys(element.ref.dataset).length, 2)
    assert.equal(element.ref.dataset.toolkitId, '23')
    assert.equal(element.ref.dataset.someName, 'Other Name')

    assert.equal(element.ref.getAttribute('data-toolkit-id'), '23')
    assert.equal(element.ref.getAttribute('data-some-name'), 'Other Name')
  })

  it('removes data attribute', () => {
    // given
    const element = createFromTemplate<AnyElement>([
      'div',
      {
        dataset: {
          name: 'name',
          anything: 'true',
        },
      },
    ])

    assert.equal(Object.entries(element.description.dataset).length, 2)
    const dataset = {
      name: 'name',
      anything: 'true',
    }
    assert.deepEqual(element.description.dataset, dataset)

    assert.equal(Object.keys(element.ref.dataset).length, 2)
    assert.equal(element.ref.dataset.name, 'name')
    assert.equal(element.ref.dataset.anything, 'true')

    // when
    Patch.apply(Patch.removeDataAttribute('name', element))
    Patch.apply(Patch.removeDataAttribute('anything', element))

    // then
    assert.equal(element.ref.dataset.name, undefined)
    assert.equal(element.ref.dataset.anything, undefined)
  })

  it('adds style property', () => {
    // given
    const element = createFromTemplate<AnyElement>(['div'])

    // when
    Patch.apply(Patch.setStyleProperty('color', 'black', element))

    // then
    assert.equal(element.ref.style.color, 'black')
  })

  it('replaces style property', () => {
    // given
    const element = createFromTemplate<AnyElement>([
      'div',
      {
        style: {
          textDecoration: 'underline',
        },
      },
    ])

    assert.equal(element.description.style.textDecoration, 'underline')
    assert.equal(element.ref.style.textDecoration, 'underline')

    // when
    Patch.apply(Patch.setStyleProperty('textDecoration', 'overline', element))

    // then
    assert.equal(element.ref.style.textDecoration, 'overline')
  })

  it('removes style property', () => {
    // given
    const element = createFromTemplate<AnyElement>([
      'div',
      {
        style: {
          visibility: 'hidden',
        },
      },
    ])

    assert.equal(element.description.style.visibility, 'hidden')
    assert.equal(element.ref.style.visibility, 'hidden')

    // when
    Patch.apply(Patch.removeStyleProperty('visibility', element))

    // then
    assert.equal(element.ref.style.visibility, '')
  })

  it('adds class name', () => {
    // given
    const element = createFromTemplate<AnyElement>([
      'div',
      {
        class: {},
      },
    ])

    assert.equal(element.description.class, undefined)
    assert.deepEqual([...element.ref.classList], [])

    // when
    Patch.apply(Patch.setClassName('test', element))

    // then
    assert.deepEqual([...element.ref.classList], ['test'])
  })

  it('removes class name', () => {
    // given
    const element = createFromTemplate<AnyElement>([
      'div',
      {
        class: 'test',
      },
    ])

    assert.equal(element.description.class, 'test')
    assert.deepEqual([...element.ref.classList], ['test'])

    // when
    Patch.apply(Patch.setClassName('', element))

    // then
    assert.deepEqual([...element.ref.classList], [])
  })

  it('adds listener', () => {
    // given
    const element = createFromTemplate<AnyElement>(['div'])
    const onClick = vi.fn()

    // when
    Patch.apply(Patch.addListener('onClick', onClick, element, false))
    element.ref.click()

    // then
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('replaces listener', () => {
    // given
    const doSomething = vi.fn()
    const doSomethingElse = vi.fn()
    const element = createFromTemplate<AnyElement>([
      'div',
      {
        onClick: doSomething,
      },
    ])

    // when
    Patch.apply(
      Patch.replaceListener(
        'onClick',
        doSomething,
        doSomethingElse,
        element,
        false,
      ),
    )
    element.ref.click()

    // then
    expect(doSomething).not.toHaveBeenCalled()
    expect(doSomethingElse).toHaveBeenCalledOnce()
  })

  it('removes listener', () => {
    // given
    const onClick = vi.fn()
    const element = createFromTemplate<AnyElement>(['div', { onClick }])
    element.ref.click()

    // when
    Patch.apply(Patch.removeListener('onClick', onClick, element, false))
    element.ref.click()

    // then
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('sets property', () => {
    // given
    const element = createFromTemplate<AnyElement>(['div'])

    assert.equal(element.description.properties, undefined)
    assert.equal(getProperty(element, 'customAttribute'), undefined)

    // when
    Patch.apply(Patch.setProperty('customAttribute', 'customValue', element))

    // then
    assert.equal(getProperty(element, 'customAttribute'), 'customValue')
  })

  it('deletes property', () => {
    // given
    const element = createFromTemplate<AnyElement>([
      'div',
      {
        properties: {
          customAttribute: 'customValue',
        },
      },
    ])

    assert.equal(element.description.properties.customAttribute, 'customValue')
    assert.equal(getProperty(element, 'customAttribute'), 'customValue')

    // when
    Patch.apply(Patch.deleteProperty('customAttribute', element))

    // then
    assert.equal(getProperty(element, 'customAttribute'), undefined)
  })

  it('replaces property', () => {
    // given
    const element = createFromTemplate<AnyElement>([
      'div',
      {
        properties: {
          customAttribute: 'customValue',
        },
      },
    ])

    assert.equal(element.description.properties.customAttribute, 'customValue')
    assert.equal(getProperty(element, 'customAttribute'), 'customValue')

    // when
    Patch.apply(Patch.setProperty('customAttribute', 'anotherValue', element))

    // then
    assert.equal(getProperty(element, 'customAttribute'), 'anotherValue')
  })

  it('inserts child node to an empty element', () => {
    // given
    const element = createFromTemplate<AnyElement>(['div'])
    const span = createElement('span')

    // then
    assert.equal(element.ref.childNodes.length, 0)

    // when
    Patch.apply(Patch.insertChild(span, 0, element))

    // then
    assert.equal(element.children.length, 1)
    assert.equal(element.ref.childNodes.length, 1)

    assert.equal(element.children[0], span)
    assert.equal(element.ref.firstElementChild, span.ref)
  })

  it('inserts child node before other child', () => {
    // given
    const element = createFromTemplate<AnyElement>([
      'div',
      ['span'],
      ['span'],
      ['span'],
    ])
    const link = createElement('a')

    // then
    assert.equal(element.children.length, 3)
    assert.equal(element.ref.childNodes.length, 3)

    // when
    Patch.apply(Patch.insertChild(link, 0, element))

    // then
    assert.equal(element.children.length, 4)
    assert.equal(element.ref.childNodes.length, 4)

    assert.equal(element.children[0], link)
    assert(link.ref)
    assert.equal(element.ref.firstElementChild, link.ref)
  })

  it('inserts child node at the end', () => {
    // given
    const element = createFromTemplate<AnyElement>(['div', ['span']])
    const link = createElement('a')

    // then
    assert.equal(element.children.length, 1)
    assert.equal(element.ref.childNodes.length, 1)

    // when
    Patch.apply(Patch.insertChild(link, 1, element))

    // then
    assert.equal(element.children.length, 2)
    assert.equal(element.ref.childNodes.length, 2)

    assert.equal(element.children[1], link)
    assert(link.ref)
    assert.equal(element.ref.childNodes[1], link.ref)
  })
  describe('move child node', () => {
    const Component = class extends toolkit.Component {
      render(): Template {
        return (this.children[0] || null) as Template
      }
    }

    it('moves element', () => {
      // given
      const element = createFromTemplate<AnyElement>([
        'div',
        ['p'],
        ['div'],
        ['span'],
      ])
      const paragraph = element.children[0]

      // then
      assert.equal(element.children.length, 3)
      assert.equal(element.ref.childNodes.length, 3)

      // when
      Patch.apply(Patch.moveChild(paragraph, 0, 2, element))

      // then
      assert.equal(element.children.length, 3)
      assert.equal(element.ref.childNodes.length, 3)

      assert.equal(element.children[0].description.name, 'div')
      assert.equal((element.ref.childNodes[0] as Element).tagName, 'DIV')

      assert.equal(element.children[1].description.name, 'span')
      assert.equal((element.ref.childNodes[1] as Element).tagName, 'SPAN')

      assert.equal(element.children[2].description.name, 'p')
      assert.equal((element.ref.childNodes[2] as Element).tagName, 'P')
    })

    it('moves component with child element', () => {
      // given
      const element = createFromTemplate<AnyElement>([
        'div',
        ['p'],
        [Component, ['section']],
        ['span'],
      ])
      const component = element.children[1]

      // then
      assert.equal(element.children.length, 3)
      assert.equal(element.ref.childNodes.length, 3)

      // when
      Patch.apply(Patch.moveChild(component, 1, 0, element))

      // then
      assert.equal(element.children.length, 3)
      assert.equal(element.ref.childNodes.length, 3)

      assert.equal(element.children[0].constructor, Component)
      assert.equal((element.ref.childNodes[0] as Element).tagName, 'SECTION')

      assert.equal(element.children[1].description.name, 'p')
      assert.equal((element.ref.childNodes[1] as Element).tagName, 'P')

      assert.equal(element.children[2].description.name, 'span')
      assert.equal((element.ref.childNodes[2] as Element).tagName, 'SPAN')
    })

    it('moves empty component', () => {
      // given
      const element = createFromTemplate<AnyElement>([
        'div',
        [Component],
        ['span'],
      ])
      const component = element.children[0]

      // then
      assert.equal(element.children.length, 2)
      assert.equal(element.ref.childNodes.length, 2)

      // when
      Patch.apply(Patch.moveChild(component, 0, 1, element))

      // then
      assert.equal(element.children.length, 2)
      assert.equal(element.ref.childNodes.length, 2)

      assert.equal(element.children[0].description.name, 'span')
      assert.equal((element.ref.childNodes[0] as Element).tagName, 'SPAN')

      assert.equal(element.children[1].constructor, Component)
      assert(element.ref.childNodes[1].textContent!.includes('Component'))
    })
  })

  describe('replace child node', () => {
    const Component = class extends toolkit.Component {
      render(): Template {
        return ['component']
      }
    }

    it('replaces element with component', () => {
      // given
      const element = createFromTemplate<AnyElement>(['div', ['p']])
      const child = element.children[0]

      const component = createFromTemplate<AnyElement>([Component])

      // when
      Patch.apply(Patch.replaceChild(child, component, element))

      // then
      assert.equal(element.children[0], component)
      assert.equal(element.children[0].ref.tagName, 'COMPONENT')
    })

    it('replaces element with element', () => {
      // given
      const element = createFromTemplate<AnyElement>(['div', ['p']])
      const child = element.children[0]

      const span = createFromTemplate<AnyElement>(['span'])

      // when
      Patch.apply(Patch.replaceChild(child, span, element))

      // then
      assert.equal(element.children[0], span)
      assert.equal(element.children[0].ref.tagName, 'SPAN')
    })

    it('replaces component with component', () => {
      // given
      const element = createFromTemplate<AnyElement>(['div', [Component]])
      const child = element.children[0]

      const component = createFromTemplate<AnyElement>([Component])

      // when
      Patch.apply(Patch.replaceChild(child, component, element))

      // then
      assert.equal(element.children[0], component)
      assert.equal(element.children[0].ref.tagName, 'COMPONENT')
    })

    it('replaces component with element', () => {
      // given
      const element = createFromTemplate<AnyElement>(['div', [Component]])
      const child = element.children[0]

      const span = createFromTemplate<AnyElement>(['span'])

      // when
      Patch.apply(Patch.replaceChild(child, span, element))

      // then
      assert.equal(element.children[0], span)
      assert.equal(element.children[0].ref.tagName, 'SPAN')
    })
  })

  describe('remove child node', () => {
    const Component = class extends toolkit.Component {
      render(): Template {
        return (this.children[0] || null) as Template
      }
    }

    it('removes element', () => {
      // given
      const element = createFromTemplate<AnyElement>([
        'div',
        ['p'],
        ['div'],
        ['span'],
      ])
      const div = element.children[1]

      // then
      assert.equal(element.children.length, 3)
      assert.equal(element.ref.childNodes.length, 3)

      // when
      Patch.apply(Patch.removeChild(div, 1, element))

      // then
      assert.equal(element.children.length, 2)
      assert.equal(element.ref.childNodes.length, 2)

      assert.equal(element.children[0].description.name, 'p')
      assert.equal((element.ref.childNodes[0] as Element).tagName, 'P')

      assert.equal(element.children[1].description.name, 'span')
      assert.equal((element.ref.childNodes[1] as Element).tagName, 'SPAN')

      // given
      const p = element.children[0]

      // when
      Patch.apply(Patch.removeChild(p, 0, element))

      // then
      assert.equal(element.children.length, 1)
      assert.equal(element.ref.childNodes.length, 1)

      assert.equal(element.children[0].description.name, 'span')
      assert.equal((element.ref.childNodes[0] as Element).tagName, 'SPAN')

      // given
      const span = element.children[0]

      // when
      Patch.apply(Patch.removeChild(span, 0, element))

      // then
      assert.equal(element.children, undefined)
      assert.equal(element.ref.childNodes.length, 0)
    })

    it('removes component with child element', () => {
      // given
      const element = createFromTemplate<AnyElement>([
        'div',
        ['p'],
        [Component, ['span']],
      ])
      const component = element.children[1]

      // then
      assert.equal(element.children.length, 2)
      assert.equal(element.ref.childNodes.length, 2)

      assert.equal(element.children[1].constructor, Component)
      assert.equal((element.ref.childNodes[1] as Element).tagName, 'SPAN')

      // when
      Patch.apply(Patch.removeChild(component, 1, element))

      // then
      assert.equal(element.children.length, 1)
      assert.equal(element.ref.childNodes.length, 1)
    })

    it('removes empty component', () => {
      // given
      const element = createFromTemplate<AnyElement>([
        'div',
        ['p'],
        [Component],
      ])
      const component = element.children[1]

      // then
      assert.equal(element.children.length, 2)
      assert.equal(element.ref.childNodes.length, 2)

      assert.equal(element.children[1].constructor, Component)
      assert(element.ref.childNodes[1].textContent!.includes('Component'))

      // when
      Patch.apply(Patch.removeChild(component, 1, element))

      // then
      assert.equal(element.children.length, 1)
      assert.equal(element.ref.childNodes.length, 1)
    })
  })

  it('sets text content', () => {
    // given
    const element = createFromTemplate<AnyElement>(['div', 'one'])

    assert.equal(element.description.children[0].text, 'one')
    assert.equal(element.ref.textContent, 'one')

    // when

    const { Description, VirtualDOM } = toolkit

    const two = VirtualDOM.createFromDescription(
      new Description.TextDescription('two'),
    )!
    Patch.apply(Patch.replaceChild(element.children[0], two, element))

    // then
    assert.equal(element.ref.textContent, 'two')
  })

  it('removes text content', () => {
    // given
    const element = createFromTemplate<AnyElement>(['div', 'one'])

    assert.equal(element.description.children[0].text, 'one')
    assert.equal(element.ref.textContent, 'one')

    // when
    Patch.apply(Patch.removeChild(element.children[0], 0, element))

    // then
    assert.equal(element.ref.textContent, '')
  })
})
