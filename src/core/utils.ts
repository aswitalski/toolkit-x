// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFunction = (...args: any[]) => unknown

/*
 * Checks a condition the toolkit relies on internally. Unlike
 * toolkit.assert, which reports invalid usage, it throws in all modes.
 */
export function invariant(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

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
  // whether the delayed call is needed, not when only the leading call was made
  let isTrailing = false

  let context: unknown
  let params: Parameters<T>

  return function debounced(this: unknown, ...args: Parameters<T>) {
    const isFirstInvocation = !taskId
    if (taskId) {
      clearTimeout(taskId)
    }
    isTrailing = !(isFirstInvocation && leading)
    taskId = setTimeout(() => {
      taskId = null
      if (isTrailing) {
        fn.call(context, ...params)
      }
    }, wait)

    // eslint-disable-next-line @typescript-eslint/no-this-alias -- kept for the delayed call
    context = this
    params = args

    if (!isTrailing) {
      return fn.call(context, ...params)
    }
  }
}

const createUUID = () => {
  const s4 = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1)
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`
}

export const lowerDash = (name: string) =>
  name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

export const getAttributeName = (key: string) => {
  if (key === 'htmlFor') {
    // the DOM name of the for attribute
    return 'for'
  } else if (key === 'acceptCharset' || key === 'httpEquiv') {
    return lowerDash(key)
  } else if (key.startsWith('aria')) {
    return `aria-${key.slice(4).toLowerCase()}`
  }
  return key.toLowerCase()
}

export const getEventName = (key: string) =>
  key === 'onDoubleClick' ? 'dblclick' : key.slice(2).toLowerCase()

const postRender = (fn: FrameRequestCallback) => {
  // since Chromium 64 there are some problems with animations not being
  // triggered correctly, this hack solves the problem across all OS-es

  /* eslint-disable prefer-arrow-callback */
  requestAnimationFrame(function () {
    requestAnimationFrame(fn)
  })
  /* eslint-enable prefer-arrow-callback */
}

export const deepFreeze = <T>(obj: T): T => {
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

/* The helpers of the public API, the others are used internally. */
const Utils = {
  throttle,
  debounce,
  createUUID,
  postRender,
}

export default Utils
