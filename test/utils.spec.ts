import toolkit from '../src/index.js'

describe('Utils', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const {
    debounce,
    throttle,
    lowerDash,
    getAttributeName,
    getEventName,
    addDataPrefix,
    createUUID,
    isSupportedAttribute,
  } = toolkit.utils

  describe('throttle', () => {
    it('throttles using specified wait time', async () => {
      // given
      const wait = 50
      const timestamps: number[] = []
      const fn = () => timestamps.push(Date.now())
      const waitTimes = new Array(1000)
        .fill(0)
        .map(() => Math.floor(Math.random() * 200))

      // when
      const throttled = throttle(fn, wait)

      await Promise.all(
        waitTimes.map(
          waitTime =>
            new Promise<void>(resolve =>
              setTimeout(() => {
                throttled()
                resolve()
              }, waitTime),
            ),
        ),
      )

      // then
      assert(timestamps.length <= 5)
      const margin = 3
      for (let i = 1; i < timestamps.length; i++) {
        assert(timestamps[i] + margin >= timestamps[i - 1] + wait)
      }
    })

    it('delays first event', async () => {
      // given
      const wait = 50
      const timestamps: number[] = []
      const startTimestamp = Date.now()
      const fn = () => timestamps.push(Date.now())
      const waitTimes = new Array(1000)
        .fill(0)
        .map(() => Math.floor(Math.random() * 200))

      // when
      const throttled = throttle(fn, wait, true)

      await Promise.all(
        waitTimes.map(
          waitTime =>
            new Promise<void>(resolve =>
              setTimeout(() => {
                throttled()
                resolve()
              }, waitTime),
            ),
        ),
      )

      // then
      assert(timestamps[0] >= startTimestamp + wait)
    })

    it('does not throttle infrequent events', async () => {
      // given
      const wait = 20
      const timestamps: number[] = []
      const fn = () => timestamps.push(Date.now())
      const waitTimes = [0, 30, 62, 94, 124]

      // when
      const throttled = throttle(fn, wait)

      await Promise.all(
        waitTimes.map(
          waitTime =>
            new Promise<void>(resolve =>
              setTimeout(() => {
                throttled()
                resolve()
              }, waitTime),
            ),
        ),
      )

      // then
      assert.equal(timestamps.length, 5)
      for (let i = 1; i < timestamps.length; i++) {
        assert(timestamps[i] + 1 >= timestamps[i - 1] + wait)
      }
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('calls once after the calls stop', () => {
      // given
      const fn = vi.fn()
      const debounced = debounce(fn, 100)

      // when
      debounced(1)
      vi.advanceTimersByTime(50)
      debounced(2)
      vi.advanceTimersByTime(100)

      // then
      expect(fn).toHaveBeenCalledOnce()
      expect(fn).toHaveBeenCalledWith(2)
    })

    it('calls once for a single leading call', () => {
      // given
      const fn = vi.fn()
      const debounced = debounce(fn, 100, true)

      // when
      debounced(1)
      vi.advanceTimersByTime(200)

      // then
      expect(fn).toHaveBeenCalledOnce()
      expect(fn).toHaveBeenCalledWith(1)
    })

    it('calls again after the wait for the following calls', () => {
      // given
      const fn = vi.fn()
      const debounced = debounce(fn, 100, true)

      // when
      debounced(1)
      debounced(2)
      vi.advanceTimersByTime(100)

      // then
      expect(fn.mock.calls).toEqual([[1], [2]])
    })
  })

  describe('lower dash', () => {
    const convertions: [string, string][] = [
      ['attributeName', 'attribute-name'],
      ['TestString', 'test-string'],
      ['SomeLongAttributeName', 'some-long-attribute-name'],
    ]

    convertions.forEach(([from, to]) => {
      it(`converts "${from}" to "${to}"`, () => {
        assert.equal(lowerDash(from), to)
      })
    })
  })

  describe('get attribute name', () => {
    const convertions: [string, string][] = [
      ['accessKey', 'accesskey'],
      ['tabIndex', 'tabindex'],
      ['autoPlay', 'autoplay'],
      ['acceptCharset', 'accept-charset'],
      ['noValidate', 'novalidate'],
      ['ariaActiveDescendant', 'aria-activedescendant'],
      ['ariaMultiSelectable', 'aria-multiselectable'],
      ['ariaSetSize', 'aria-setsize'],
      ['ariaRequired', 'aria-required'],
      ['ariaAutoComplete', 'aria-autocomplete'],
    ]

    convertions.forEach(([from, to]) => {
      it(`converts "${from}" to "${to}"`, () => {
        assert.equal(getAttributeName(from), to)
      })
    })
  })
  describe('get event name', () => {
    const convertions: [string, string][] = [
      ['onClick', 'click'],
      ['onDoubleClick', 'dblclick'],
      ['onContextMenu', 'contextmenu'],
      ['onCanPlayThrough', 'canplaythrough'],
    ]

    convertions.forEach(([from, to]) => {
      it(`converts "${from}" to "${to}"`, () => {
        assert.equal(getEventName(from), to)
      })
    })
  })

  describe('add data prefix', () => {
    const convertions: [string, string][] = [
      ['reactorId', 'dataReactorId'],
      ['someCustomAttribute', 'dataSomeCustomAttribute'],
      ['name', 'dataName'],
    ]

    convertions.forEach(([from, to]) => {
      it(`converts "${from}" to "${to}"`, () => {
        assert.equal(addDataPrefix(from), to)
      })
    })
  })

  describe('create UUID', () => {
    it('creates valid UUID', () => {
      const uuid = createUUID()
      assert.equal(/........-....-....-............/.test(uuid), true)
    })
  })

  describe('is supported attribute', () => {
    it('returns true for standard attributes', () => {
      assert(isSupportedAttribute('name'))
      assert(isSupportedAttribute('id'))
      assert(isSupportedAttribute('tabIndex'))
    })

    it('returns true for "key" attribute', () => {
      assert.equal(isSupportedAttribute('key'), true)
    })

    it('returns true for "class" attribute', () => {
      assert.equal(isSupportedAttribute('class'), true)
    })

    it('returns true for "style" attribute', () => {
      assert.equal(isSupportedAttribute('style'), true)
    })

    it('returns true for "dataset" attribute', () => {
      assert.equal(isSupportedAttribute('dataset'), true)
    })

    it('returns true for "properties" attribute', () => {
      assert.equal(isSupportedAttribute('properties'), true)
    })

    it('returns false for invalid attribute', () => {
      assert.equal(isSupportedAttribute('invalid'), false)
    })
  })
})
