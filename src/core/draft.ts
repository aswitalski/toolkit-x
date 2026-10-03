import { invariant } from './utils.js'

/*
 * Drafts let commands change the state as if it was mutable. A draft is
 * a proxy recording the changes on a shallow copy of its object, with the
 * nested objects drafted when accessed. The next state is made of the
 * copies, sharing the parts left unchanged with the previous state.
 */

type Kind = 'object' | 'array' | 'map' | 'set' | 'date' | 'typed-array'

type Entries = Record<PropertyKey, unknown>

/* Any of the typed arrays, as Uint8Array or Float32Array. */
interface TypedArray extends ArrayBufferView {
  slice(): TypedArray
}

interface Draft {
  kind: Kind
  base: object
  copy: object | null
  parent: Draft | null
  scope: Scope
  modified: boolean
  proxy: object
  result: object | null
  // the drafts of the items of a set, replacing them in the copy
  items: Map<unknown, object> | null
}

interface Scope {
  revokes: (() => void)[]
  // the new values checked for drafts when finalizing
  visited: WeakSet<object>
}

/* The drafts by their proxies. */
const drafts = new WeakMap<object, Draft>()

/* The drafts by the targets of their proxies. */
const targets = new WeakMap<object, Draft>()

// matching the original objects of the drafts as well as the drafts
const ARRAY_SEARCHES = new Set<PropertyKey>([
  'includes',
  'indexOf',
  'lastIndexOf',
])

// with subarray() writing to the memory of the array, as a view of it
const TYPED_ARRAY_MUTATORS = new Set<PropertyKey>([
  'copyWithin',
  'fill',
  'reverse',
  'set',
  'sort',
  'subarray',
])

const getKind = (value: unknown): Kind | null => {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  if (ArrayBuffer.isView(value)) {
    return value instanceof DataView ? null : 'typed-array'
  }
  switch (Object.getPrototypeOf(value)) {
    case Object.prototype:
    case null:
      return 'object'
    case Array.prototype:
      return 'array'
    case Map.prototype:
      return 'map'
    case Set.prototype:
      return 'set'
    case Date.prototype:
      return 'date'
    default:
      return null
  }
}

const INVALID_VALUE =
  'The state can contain only primitives, functions, plain objects, arrays, maps, sets, dates and typed arrays'

/* Returns the kind of a value allowed in the state, null when not drafted. */
const checkValue = (value: unknown): Kind | null => {
  const kind = getKind(value)
  invariant(kind || typeof value !== 'object' || value === null, INVALID_VALUE)
  return kind
}

const current = (draft: Draft) => draft.copy ?? draft.base

const createDraft = (
  base: object,
  kind: Kind,
  parent: Draft | null,
  scope: Scope,
): object => {
  // arrays need an array target to be recognized by Array.isArray()
  const target: object =
    kind === 'array'
      ? []
      : (Object.create(Object.getPrototypeOf(base) as object | null) as object)
  const { proxy, revoke } = Proxy.revocable(target, handler)
  const draft: Draft = {
    kind,
    base,
    copy: null,
    parent,
    scope,
    modified: false,
    proxy,
    result: null,
    items: null,
  }
  drafts.set(proxy, draft)
  targets.set(target, draft)
  scope.revokes.push(revoke)
  return proxy
}

const prepareCopy = (draft: Draft) => {
  if (draft.copy) {
    return
  }
  const { base } = draft
  switch (draft.kind) {
    case 'object':
      draft.copy = Object.assign(
        Object.create(Object.getPrototypeOf(base) as object | null) as object,
        base,
      )
      break
    case 'array':
      draft.copy = (base as unknown[]).slice()
      break
    case 'map':
      draft.copy = new Map(base as Map<unknown, unknown>)
      break
    case 'set': {
      // the items are drafted up front, as sets have no keys to draft them by
      const copy = new Set<unknown>()
      draft.items = new Map()
      for (const item of base as Set<unknown>) {
        const kind = checkValue(item)
        if (kind) {
          const itemDraft = createDraft(
            item as object,
            kind,
            draft,
            draft.scope,
          )
          draft.items.set(item, itemDraft)
          copy.add(itemDraft)
        } else {
          copy.add(item)
        }
      }
      draft.copy = copy
      break
    }
    case 'date':
      draft.copy = new Date((base as Date).getTime())
      break
    case 'typed-array':
      // of the same type, as slice() creates the array with its constructor
      draft.copy = (base as TypedArray).slice()
      break
  }
}

const markModified = (draft: Draft | null) => {
  while (draft && !draft.modified) {
    prepareCopy(draft)
    draft.modified = true
    draft = draft.parent
  }
}

/*
 * Returns the value under the key, drafted when it is a draftable value
 * of the base object, left unchanged.
 */
const getValue = (
  draft: Draft,
  value: unknown,
  baseValue: unknown,
  store: (copy: object, child: object) => void,
): unknown => {
  if (drafts.has(value as object)) {
    return value
  }
  const kind = checkValue(value)
  if (!kind || value !== baseValue) {
    return value
  }
  prepareCopy(draft)
  const child = createDraft(value as object, kind, draft, draft.scope)
  store(draft.copy!, child)
  return child
}

/* Returns the original object of a draft, or the value itself. */
const getOriginal = (value: unknown): unknown =>
  (typeof value === 'object' && value !== null && drafts.get(value)?.base) ||
  value

const getProperty = (draft: Draft, key: PropertyKey): unknown => {
  const source = current(draft) as Entries
  if (draft.kind === 'array' && ARRAY_SEARCHES.has(key)) {
    // the objects passed to commands, e.g. from props, are not the drafts
    return (value: unknown, ...args: [number?]) => {
      const items = (current(draft) as unknown[]).map(getOriginal)
      return items[key as 'indexOf'](getOriginal(value), ...args)
    }
  }
  if (!Object.hasOwn(source, key)) {
    // the array methods work through the proxy
    return Reflect.get(source, key, draft.proxy)
  }
  const base = draft.base as Entries
  return getValue(
    draft,
    source[key],
    Object.hasOwn(base, key) ? base[key] : undefined,
    (copy, child) => ((copy as Entries)[key] = child),
  )
}

const getMapValue = (draft: Draft, key: unknown): unknown => {
  const source = current(draft) as Map<unknown, unknown>
  return getValue(
    draft,
    source.get(key),
    (draft.base as Map<unknown, unknown>).get(key),
    (copy, child) => (copy as Map<unknown, unknown>).set(key, child),
  )
}

/* The methods of a map draft, keeping the copy in sync. */
const mapMethods = new Map<PropertyKey, (draft: Draft) => unknown>([
  ['get', draft => (key: unknown) => getMapValue(draft, key)],
  [
    'set',
    draft => (key: unknown, value: unknown) => {
      const source = current(draft) as Map<unknown, unknown>
      if (!source.has(key) || !Object.is(source.get(key), value)) {
        markModified(draft)
        ;(draft.copy as Map<unknown, unknown>).set(key, value)
      }
      return draft.proxy
    },
  ],
  [
    'delete',
    draft => (key: unknown) => {
      if (!(current(draft) as Map<unknown, unknown>).has(key)) {
        return false
      }
      markModified(draft)
      return (draft.copy as Map<unknown, unknown>).delete(key)
    },
  ],
  [
    'clear',
    draft => () => {
      if ((current(draft) as Map<unknown, unknown>).size) {
        markModified(draft)
        ;(draft.copy as Map<unknown, unknown>).clear()
      }
    },
  ],
  [
    'forEach',
    draft =>
      (
        callback: (value: unknown, key: unknown, map: object) => void,
        thisArg?: unknown,
      ) => {
        for (const key of [
          ...(current(draft) as Map<unknown, unknown>).keys(),
        ]) {
          callback.call(thisArg, getMapValue(draft, key), key, draft.proxy)
        }
      },
  ],
  [
    'keys',
    draft => () =>
      [...(current(draft) as Map<unknown, unknown>).keys()].values(),
  ],
  [
    'values',
    draft =>
      function* () {
        for (const key of [
          ...(current(draft) as Map<unknown, unknown>).keys(),
        ]) {
          yield getMapValue(draft, key)
        }
      },
  ],
  ['entries', draft => () => mapEntries(draft)],
  [Symbol.iterator, draft => () => mapEntries(draft)],
])

function* mapEntries(draft: Draft) {
  for (const key of [...(current(draft) as Map<unknown, unknown>).keys()]) {
    yield [key, getMapValue(draft, key)]
  }
}

const hasSetItem = (draft: Draft, item: unknown) => {
  const source = current(draft) as Set<unknown>
  if (source.has(item)) {
    return true
  }
  const itemDraft = draft.items?.get(item)
  return itemDraft !== undefined && source.has(itemDraft)
}

/* The methods of a set draft, iterating over the drafted items. */
const setMethods = new Map<PropertyKey, (draft: Draft) => unknown>([
  ['has', draft => (item: unknown) => hasSetItem(draft, item)],
  [
    'add',
    draft => (item: unknown) => {
      if (!hasSetItem(draft, item)) {
        markModified(draft)
        ;(draft.copy as Set<unknown>).add(item)
      }
      return draft.proxy
    },
  ],
  [
    'delete',
    draft => (item: unknown) => {
      if (!hasSetItem(draft, item)) {
        return false
      }
      markModified(draft)
      const copy = draft.copy as Set<unknown>
      return copy.delete(item) || copy.delete(draft.items!.get(item))
    },
  ],
  [
    'clear',
    draft => () => {
      if ((current(draft) as Set<unknown>).size) {
        markModified(draft)
        ;(draft.copy as Set<unknown>).clear()
      }
    },
  ],
  [
    'forEach',
    draft =>
      (
        callback: (value: unknown, key: unknown, set: object) => void,
        thisArg?: unknown,
      ) => {
        for (const item of setItems(draft)) {
          callback.call(thisArg, item, item, draft.proxy)
        }
      },
  ],
  ['keys', draft => () => setItems(draft).values()],
  ['values', draft => () => setItems(draft).values()],
  [Symbol.iterator, draft => () => setItems(draft).values()],
  [
    'entries',
    draft => () =>
      setItems(draft)
        .map(item => [item, item] as const)
        .values(),
  ],
])

const setItems = (draft: Draft) => {
  prepareCopy(draft)
  return [...(draft.copy as Set<unknown>)]
}

/*
 * Reads the property of a map, set, date or typed array, keeping their
 * internal slots out of the proxy.
 */
const getSlotProperty = (draft: Draft, key: PropertyKey): unknown => {
  if (draft.kind === 'map' || draft.kind === 'set') {
    const method = (draft.kind === 'map' ? mapMethods : setMethods).get(key)
    if (method) {
      return method(draft)
    }
    if (draft.kind === 'set' && key !== 'size') {
      // the other methods, as union(), take the drafted items
      prepareCopy(draft)
    }
  }
  if (draft.kind === 'typed-array' && key === 'buffer') {
    // the memory of the copy, as it can be written to
    markModified(draft)
    return (draft.copy as TypedArray).buffer
  }
  const source = current(draft) as Entries
  if (draft.kind === 'typed-array' && Object.hasOwn(source, key)) {
    return source[key]
  }
  const value = Reflect.get(source, key, source)
  if (typeof value !== 'function' || key === 'constructor') {
    return value
  }
  const method = value as (...args: unknown[]) => unknown
  const mutates =
    draft.kind === 'date'
      ? typeof key === 'string' && key.startsWith('set')
      : draft.kind === 'typed-array' && TYPED_ARRAY_MUTATORS.has(key)
  if (!mutates) {
    return method.bind(source)
  }
  return (...args: unknown[]) => {
    prepareCopy(draft)
    const copy = draft.copy!
    const time = draft.kind === 'date' ? (copy as Date).getTime() : null
    const result = method.apply(copy, args)
    if (draft.kind !== 'date' || !Object.is(time, (copy as Date).getTime())) {
      markModified(draft)
    }
    return result === copy ? draft.proxy : result
  }
}

const handler: ProxyHandler<object> = {
  get(target, key) {
    const draft = targets.get(target)!
    return draft.kind === 'object' || draft.kind === 'array'
      ? getProperty(draft, key)
      : getSlotProperty(draft, key)
  },
  set(target, key, value) {
    const draft = targets.get(target)!
    const source = current(draft) as Entries
    if (Object.hasOwn(source, key) && Object.is(source[key], value)) {
      return true
    }
    markModified(draft)
    ;(draft.copy as Entries)[key] = value
    return true
  },
  deleteProperty(target, key) {
    const draft = targets.get(target)!
    if (Object.hasOwn(current(draft), key)) {
      markModified(draft)
      delete (draft.copy as Entries)[key]
    }
    return true
  },
  has(target, key) {
    return key in current(targets.get(target)!)
  },
  ownKeys(target) {
    return Reflect.ownKeys(current(targets.get(target)!))
  },
  getOwnPropertyDescriptor(target, key) {
    const draft = targets.get(target)!
    const source = current(draft) as Entries
    const descriptor = Reflect.getOwnPropertyDescriptor(source, key)
    if (!descriptor) {
      return undefined
    }
    // the length of the array target is not configurable
    const configurable = draft.kind !== 'array' || key !== 'length'
    return 'value' in descriptor
      ? { ...descriptor, value: source[key], writable: true, configurable }
      : { ...descriptor, configurable }
  },
  defineProperty(target, key, descriptor) {
    const draft = targets.get(target)!
    markModified(draft)
    return Reflect.defineProperty(draft.copy!, key, descriptor)
  },
  setPrototypeOf() {
    return false
  },
  preventExtensions() {
    return false
  },
}

/*
 * Replaces the drafts with their results, also in the new values assigned
 * to the drafts, as the drafts are revoked once the next state is created.
 */
const finalize = (value: unknown, scope: Scope): unknown => {
  if (typeof value !== 'object' || value === null) {
    return value
  }
  const draft = drafts.get(value)
  if (draft) {
    return finalizeDraft(draft)
  }
  const kind = checkValue(value)
  if (scope.visited.has(value) || Object.isFrozen(value)) {
    return value
  }
  scope.visited.add(value)
  switch (kind) {
    case 'object':
    case 'array': {
      const entries = value as Entries
      for (const key of Reflect.ownKeys(entries)) {
        const next = finalize(entries[key], scope)
        if (next !== entries[key]) {
          entries[key] = next
        }
      }
      break
    }
    case 'map': {
      const map = value as Map<unknown, unknown>
      for (const [key, item] of map) {
        const next = finalize(item, scope)
        if (next !== item) {
          map.set(key, next)
        }
      }
      break
    }
    case 'set': {
      const set = value as Set<unknown>
      const items = [...set]
      const nextItems = items.map(item => finalize(item, scope))
      if (nextItems.some((item, index) => item !== items[index])) {
        set.clear()
        nextItems.forEach(item => set.add(item))
      }
      break
    }
  }
  return value
}

const finalizeDraft = (draft: Draft): object => {
  if (draft.result) {
    return draft.result
  }
  if (!draft.modified) {
    return (draft.result = draft.base)
  }
  const { base, copy, scope } = draft
  draft.result = copy
  switch (draft.kind) {
    case 'object':
    case 'array': {
      const entries = copy as Entries
      for (const key of Reflect.ownKeys(entries)) {
        const value = entries[key]
        if (value !== (base as Entries)[key]) {
          const next = finalize(value, scope)
          if (next !== value) {
            entries[key] = next
          }
        }
      }
      break
    }
    case 'map': {
      const map = copy as Map<unknown, unknown>
      for (const [key, value] of map) {
        if (value !== (base as Map<unknown, unknown>).get(key)) {
          map.set(key, finalize(value, scope))
        }
      }
      break
    }
    case 'set': {
      // in place, for the items referring to the set to get the result
      const set = copy as Set<unknown>
      const items = [...set]
      set.clear()
      items.forEach(item => set.add(finalize(item, scope)))
      break
    }
  }
  return draft.result!
}

/*
 * Calls the recipe with a draft of the base object and returns the result
 * of the changes made to it, or the base object when nothing has changed.
 * Plain objects, arrays, maps, sets, dates and typed arrays are drafted,
 * primitives and functions are kept as they are, to be replaced only,
 * and other values, as class instances, throw when read or assigned.
 */
export const produce = <T>(base: T, recipe: (draft: T) => void): T => {
  const kind = getKind(base)
  invariant(kind, INVALID_VALUE)
  const scope: Scope = { revokes: [], visited: new WeakSet() }
  const root = createDraft(base as object, kind, null, scope)
  try {
    recipe(root as T)
    return finalizeDraft(drafts.get(root)!) as T
  } finally {
    scope.revokes.forEach(revoke => revoke())
  }
}
