import Browser from './browser.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFunction = (...args: any[]) => unknown

const throttle = <T extends AnyFunction>(
  fn: T,
  wait = 200,
  delayFirstEvent = false,
) => {
  let lastTimestamp = 0
  let taskId: ReturnType<typeof setTimeout> | null = null

  let context: unknown
  let params: Parameters<T>

  return function throttled(this: unknown, ...args: Parameters<T>) {
    if (!taskId) {
      const timestamp = Date.now()
      const elapsed = timestamp - lastTimestamp
      const scheduleTask = (delay: number) => {
        taskId = setTimeout(() => {
          taskId = null
          lastTimestamp = Date.now()
          return fn.call(context, ...params)
        }, delay)
      }
      if (elapsed >= wait) {
        lastTimestamp = timestamp
        if (!delayFirstEvent) {
          return fn.call(this, ...args)
        }
        scheduleTask(wait)
      } else {
        scheduleTask(wait - elapsed)
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- kept for the delayed call
    context = this
    params = args
  }
}

const debounce = <T extends AnyFunction>(
  fn: T,
  wait = 200,
  leading = false,
) => {
  let taskId: ReturnType<typeof setTimeout> | null = null

  let context: unknown
  let params: Parameters<T>

  return function debounced(this: unknown, ...args: Parameters<T>) {
    const isFirstInvocation = !taskId
    if (taskId) {
      clearTimeout(taskId)
    }
    taskId = setTimeout(() => {
      taskId = null
      return fn.call(context, ...params)
    }, wait)

    // eslint-disable-next-line @typescript-eslint/no-this-alias -- kept for the delayed call
    context = this
    params = args

    if (isFirstInvocation && leading) {
      return fn.call(context, ...params)
    }
  }
}

const addDataPrefix = (attr: string) =>
  `data${attr[0]!.toUpperCase()}${attr.slice(1)}`

const createUUID = () => {
  const s4 = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1)
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`
}

const lowerDash = (name: string) =>
  name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

const getAttributeName = (key: string) => {
  if (key === 'acceptCharset' || key === 'httpEquiv') {
    return lowerDash(key)
  } else if (key.startsWith('aria')) {
    return `aria-${key.slice(4).toLowerCase()}`
  }
  return key.toLowerCase()
}

const getEventName = (key: string) =>
  key === 'onDoubleClick' ? 'dblclick' : key.slice(2).toLowerCase()

const isSpecialProperty = (prop: string) =>
  ['key', 'class', 'style', 'dataset', 'properties'].includes(prop)

const isSupportedAttribute = (attr: string) =>
  isSpecialProperty(attr) ||
  Browser.isAttributeSupported(attr) ||
  Browser.isEventSupported(attr)

const postRender = (fn: FrameRequestCallback) => {
  // since Chromium 64 there are some problems with animations not being
  // triggered correctly, this hack solves the problem across all OS-es

  /* eslint-disable prefer-arrow-callback */
  requestAnimationFrame(function () {
    requestAnimationFrame(fn)
  })
  /* eslint-enable prefer-arrow-callback */
}

const deepFreeze = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) {
    // functions are intentionally not frozen
    return obj
  }
  Object.freeze(obj)
  for (const property of Object.getOwnPropertyNames(obj)) {
    deepFreeze((obj as Record<string, unknown>)[property])
  }
  return obj
}

const Utils = {
  throttle,
  debounce,
  addDataPrefix,
  lowerDash,
  getAttributeName,
  getEventName,
  createUUID,
  isSupportedAttribute,
  isSpecialProperty,
  postRender,
  deepFreeze,
}

export default Utils
