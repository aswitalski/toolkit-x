import { produce } from '../src/core/draft.js'

describe('Draft', () => {
  describe('=> Objects', () => {
    it('sets a property on a copy', () => {
      // given
      const base = { count: 1, label: 'one' }

      // when
      const result = produce(base, draft => {
        draft.count += 1
      })

      // then
      expect(result).toEqual({ count: 2, label: 'one' })
      expect(base).toEqual({ count: 1, label: 'one' })
    })

    it('returns the base when nothing changes', () => {
      // given
      const base = { count: 1, nested: { value: 1 } }

      // when
      const result = produce(base, draft => {
        draft.count = 1
        draft.nested.value = 1
        void draft.nested
      })

      // then
      expect(result).toBe(base)
    })

    it('returns the base when the recipe only reads', () => {
      // given
      const base = { items: [{ id: 1 }], map: new Map([['a', { id: 2 }]]) }

      // when
      const result = produce(base, draft => {
        void draft.items[0].id
        void draft.map.get('a')!.id
        void [...draft.items, ...draft.map.values()]
      })

      // then
      expect(result).toBe(base)
    })

    it('copies the changed path and shares the rest', () => {
      // given
      const base = {
        changed: { nested: { value: 1 } },
        unchanged: { nested: { value: 2 } },
      }

      // when
      const result = produce(base, draft => {
        draft.changed.nested.value = 3
      })

      // then
      expect(result).toEqual({
        changed: { nested: { value: 3 } },
        unchanged: { nested: { value: 2 } },
      })
      expect(result).not.toBe(base)
      expect(result.changed).not.toBe(base.changed)
      expect(result.changed.nested).not.toBe(base.changed.nested)
      expect(result.unchanged).toBe(base.unchanged)
      expect(base.changed.nested.value).toBe(1)
    })

    it('adds and deletes properties', () => {
      // given
      const base: Record<string, number> = { a: 1, b: 2 }

      // when
      const result = produce(base, draft => {
        delete draft.a
        draft.c = 3
      })

      // then
      expect(result).toEqual({ b: 2, c: 3 })
      expect(base).toEqual({ a: 1, b: 2 })
    })

    it('ignores deleting a missing property', () => {
      // given
      const base: Record<string, number> = { a: 1 }

      // when
      const result = produce(base, draft => {
        delete draft.missing
      })

      // then
      expect(result).toBe(base)
    })

    it('reflects the changes when reading the draft', () => {
      // given
      const base: Record<string, number> = { a: 1, b: 2 }
      let observed: unknown

      // when
      produce(base, draft => {
        draft.a = 10
        delete draft.b
        draft.c = 3
        observed = {
          keys: Object.keys(draft),
          entries: { ...draft },
          has: ['a' in draft, 'b' in draft, 'c' in draft],
          json: JSON.stringify(draft),
        }
      })

      // then
      expect(observed).toEqual({
        keys: ['a', 'c'],
        entries: { a: 10, c: 3 },
        has: [true, false, true],
        json: '{"a":10,"c":3}',
      })
    })

    it('replaces a nested object', () => {
      // given
      const base = { nested: { value: 1 } }

      // when
      const result = produce(base, draft => {
        draft.nested = { value: 2 }
        draft.nested.value = 3
      })

      // then
      expect(result).toEqual({ nested: { value: 3 } })
      expect(base).toEqual({ nested: { value: 1 } })
    })

    it('keeps objects with null prototypes', () => {
      // given
      const base = Object.assign(
        Object.create(null) as Record<string, number>,
        {
          a: 1,
        },
      )

      // when
      const result = produce(base, draft => {
        draft.a = 2
      })

      // then
      expect(Object.getPrototypeOf(result)).toBe(null)
      expect(result.a).toBe(2)
    })

    it('drafts frozen objects', () => {
      // given
      const base = Object.freeze({ nested: Object.freeze({ value: 1 }) })

      // when
      const result = produce(base, draft => {
        ;(draft.nested as { value: number }).value = 2
      })

      // then
      expect(result).toEqual({ nested: { value: 2 } })
      expect(base.nested.value).toBe(1)
    })

    it('keeps primitives and functions as values', () => {
      // given
      const callback = () => {}
      const base: Record<string, unknown> = { callback, id: Symbol('id') }

      // when
      const result = produce(base, draft => {
        draft.big = 1n
        draft.other = () => {}
        void draft.callback
      })

      // then
      expect(result.callback).toBe(callback)
      expect(result.big).toBe(1n)
      expect(typeof result.other).toBe('function')
    })

    it('reads accessor properties', () => {
      // given
      const base = {
        value: 1,
        get double() {
          return 2
        },
      }
      let descriptor: PropertyDescriptor | undefined

      // when
      produce(base, draft => {
        descriptor = Object.getOwnPropertyDescriptor(draft, 'double')
      })

      // then
      expect(typeof descriptor!.get).toBe('function')
    })

    it('defines properties', () => {
      // given
      const base: Record<string, number> = { a: 1 }

      // when
      const result = produce(base, draft => {
        Object.defineProperty(draft, 'b', {
          value: 2,
          enumerable: true,
          configurable: true,
          writable: true,
        })
      })

      // then
      expect(result).toEqual({ a: 1, b: 2 })
      expect(base).toEqual({ a: 1 })
    })

    it('cannot be frozen or have its prototype changed', () => {
      produce({ a: 1 }, draft => {
        expect(() => Object.freeze(draft)).toThrow(TypeError)
        expect(() => {
          Object.setPrototypeOf(draft, null)
        }).toThrow(TypeError)
      })
    })
  })

  describe('=> Arrays', () => {
    it('is recognized as an array', () => {
      // given
      const base = { items: [1, 2] }
      let isArray = false

      // when
      produce(base, draft => {
        isArray = Array.isArray(draft.items)
      })

      // then
      expect(isArray).toBe(true)
    })

    it('supports the mutating methods', () => {
      // given
      const base = { items: [3, 1, 2] }

      // when
      const result = produce(base, draft => {
        draft.items.push(4)
        draft.items.sort()
        draft.items.reverse()
        draft.items.shift()
        draft.items.unshift(0)
        draft.items.splice(1, 1, 7, 8)
      })

      // then
      expect(result.items).toEqual([0, 7, 8, 2, 1])
      expect(base.items).toEqual([3, 1, 2])
    })

    it('changes items moved by the mutating methods', () => {
      // given
      const base = { items: [{ id: 1 }, { id: 2 }, { id: 3 }] }

      // when
      const result = produce(base, draft => {
        draft.items.shift()
        draft.items[0].id = 20
      })

      // then
      expect(result.items).toEqual([{ id: 20 }, { id: 3 }])
      expect(result.items[1]).toBe(base.items[2])
      expect(base.items).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
    })

    it('changes the items found in an array', () => {
      // given
      const base = {
        items: [
          { id: 1, done: false },
          { id: 2, done: false },
        ],
      }

      // when
      const result = produce(base, draft => {
        const item = draft.items.find(item => item.id === 2)!
        item.done = true
      })

      // then
      expect(result.items).toEqual([
        { id: 1, done: false },
        { id: 2, done: true },
      ])
      expect(result.items[0]).toBe(base.items[0])
      expect(base.items[1].done).toBe(false)
    })

    it('assigns the arrays created from a draft', () => {
      // given
      const base = { items: [{ id: 1 }, { id: 2 }, { id: 3 }] }

      // when
      const result = produce(base, draft => {
        draft.items = draft.items.filter(item => item.id !== 2)
        draft.items[1].id = 30
      })

      // then
      expect(result.items).toEqual([{ id: 1 }, { id: 30 }])
      expect(result.items[0]).toBe(base.items[0])
      expect(base.items).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
    })

    it('finds the original objects of the drafts', () => {
      // given
      const base = { items: [{ id: 1 }, { id: 2 }, { id: 1 }] }
      const [first, second] = base.items
      let observed: unknown

      // when
      const result = produce(base, draft => {
        draft.items[1].id = 20
        observed = {
          indexOf: draft.items.indexOf(second),
          lastIndexOf: draft.items.lastIndexOf(first),
          includes: draft.items.includes(second),
          draft: draft.items.indexOf(draft.items[1]),
          missing: draft.items.indexOf({ id: 2 }),
          fromIndex: draft.items.indexOf(second, 2),
        }
        draft.items.splice(draft.items.indexOf(first), 1)
      })

      // then
      expect(observed).toEqual({
        indexOf: 1,
        lastIndexOf: 0,
        includes: true,
        draft: 1,
        missing: -1,
        fromIndex: -1,
      })
      expect(result.items).toEqual([{ id: 20 }, { id: 1 }])
    })

    it('finds the primitive values', () => {
      // given
      const base = { items: [1, NaN, 2, 1] }
      let observed: unknown

      // when
      produce(base, draft => {
        observed = [
          draft.items.indexOf(2),
          draft.items.lastIndexOf(1),
          draft.items.includes(NaN),
          draft.items.indexOf(3),
        ]
      })

      // then
      expect(observed).toEqual([2, 3, true, -1])
    })

    it('sets the length', () => {
      // given
      const base = { items: [1, 2, 3] }

      // when
      const result = produce(base, draft => {
        draft.items.length = 1
      })

      // then
      expect(result.items).toEqual([1])
      expect(base.items).toEqual([1, 2, 3])
    })
  })

  describe('=> Maps', () => {
    it('is recognized as a map', () => {
      // given
      const base = { map: new Map([['a', 1]]) }
      let observed: unknown

      // when
      produce(base, draft => {
        observed = [
          draft.map instanceof Map,
          Object.prototype.toString.call(draft.map),
        ]
      })

      // then
      expect(observed).toEqual([true, '[object Map]'])
    })

    it('sets, deletes and clears entries', () => {
      // given
      const base = {
        first: new Map([
          ['a', 1],
          ['b', 2],
        ]),
        second: new Map([['c', 3]]),
      }

      // when
      const result = produce(base, draft => {
        draft.first.set('a', 10).set('d', 4)
        draft.first.delete('b')
        draft.second.clear()
      })

      // then
      expect([...result.first]).toEqual([
        ['a', 10],
        ['d', 4],
      ])
      expect(result.second.size).toBe(0)
      expect([...base.first]).toEqual([
        ['a', 1],
        ['b', 2],
      ])
      expect(base.second.size).toBe(1)
    })

    it('returns the base when nothing changes', () => {
      // given
      const base = { map: new Map([['a', 1]]) }

      // when
      const result = produce(base, draft => {
        draft.map.set('a', 1)
        draft.map.delete('missing')
        expect(draft.map.has('a')).toBe(true)
        expect(draft.map.size).toBe(1)
      })

      // then
      expect(result).toBe(base)
    })

    it('drafts the values', () => {
      // given
      const base = {
        map: new Map([
          ['a', { value: 1 }],
          ['b', { value: 2 }],
          ['c', { value: 3 }],
        ]),
      }

      // when
      const result = produce(base, draft => {
        draft.map.get('a')!.value = 10
        for (const [key, item] of draft.map) {
          if (key === 'b') {
            item.value = 20
          }
        }
        draft.map.forEach(item => {
          if (item.value === 3) {
            item.value = 30
          }
        })
      })

      // then
      expect([...result.map.values()]).toEqual([
        { value: 10 },
        { value: 20 },
        { value: 30 },
      ])
      expect([...base.map.values()]).toEqual([
        { value: 1 },
        { value: 2 },
        { value: 3 },
      ])
    })

    it('iterates over the keys', () => {
      // given
      const base = {
        map: new Map([
          ['a', 1],
          ['b', 2],
        ]),
      }

      // when
      const result = produce(base, draft => {
        for (const key of draft.map.keys()) {
          draft.map.set(key, draft.map.get(key)! * 10)
        }
      })

      // then
      expect([...result.map]).toEqual([
        ['a', 10],
        ['b', 20],
      ])
    })

    it('shares the unchanged values', () => {
      // given
      const base = {
        map: new Map([
          ['a', { value: 1 }],
          ['b', { value: 2 }],
        ]),
      }

      // when
      const result = produce(base, draft => {
        draft.map.get('a')!.value = 10
        void [...draft.map.values()]
      })

      // then
      expect(result.map.get('b')).toBe(base.map.get('b'))
    })
  })

  describe('=> Sets', () => {
    it('adds, deletes and clears items', () => {
      // given
      const base = { first: new Set([1, 2]), second: new Set([3]) }

      // when
      const result = produce(base, draft => {
        draft.first.add(3).add(1)
        draft.first.delete(2)
        draft.second.clear()
      })

      // then
      expect([...result.first]).toEqual([1, 3])
      expect(result.second.size).toBe(0)
      expect([...base.first]).toEqual([1, 2])
      expect(base.second.size).toBe(1)
    })

    it('returns the base when nothing changes', () => {
      // given
      const base = { set: new Set([1, 2]) }

      // when
      const result = produce(base, draft => {
        draft.set.add(1)
        draft.set.delete(3)
        expect(draft.set.has(2)).toBe(true)
        expect(draft.set.size).toBe(2)
      })

      // then
      expect(result).toBe(base)
    })

    it('drafts the items', () => {
      // given
      const first = { value: 1 }
      const second = { value: 2 }
      const base = { set: new Set([first, second]) }

      // when
      const result = produce(base, draft => {
        for (const item of draft.set) {
          if (item.value === 1) {
            item.value = 10
          }
        }
      })

      // then
      expect([...result.set]).toEqual([{ value: 10 }, { value: 2 }])
      expect([...result.set][1]).toBe(second)
      expect(first.value).toBe(1)
    })

    it('drafts the items in all the iteration methods', () => {
      // given
      const base = { set: new Set([{ value: 1 }, { value: 2 }, { value: 3 }]) }

      // when
      const result = produce(base, draft => {
        draft.set.forEach(item => {
          if (item.value === 1) {
            item.value = 10
          }
        })
        for (const item of draft.set.keys()) {
          if (item.value === 2) {
            item.value = 20
          }
        }
        for (const [item] of draft.set.entries()) {
          if (item.value === 3) {
            item.value = 30
          }
        }
      })

      // then
      expect([...result.set]).toEqual([
        { value: 10 },
        { value: 20 },
        { value: 30 },
      ])
    })

    it('drafts the items in the other methods', () => {
      // given
      const base = { set: new Set([{ value: 1 }]) }

      // when
      const result = produce(base, draft => {
        // union() is available in the browser, not in the es2024 types
        const set = draft.set as typeof draft.set & {
          union(other: Set<unknown>): Set<{ value: number }>
        }
        const [item] = set.union(new Set())
        item.value = 10
      })

      // then
      expect([...result.set]).toEqual([{ value: 10 }])
    })

    it('refers to the result from its items', () => {
      // given
      const base: { set: Set<{ set: unknown }> } = {
        set: new Set([{ set: null }]),
      }

      // when
      const result = produce(base, draft => {
        const [item] = draft.set
        item.set = draft.set
      })

      // then
      const [item] = result.set
      expect(item.set).toBe(result.set)
    })

    it('finds and deletes the drafted items by the original ones', () => {
      // given
      const first = { value: 1 }
      const second = { value: 2 }
      const base = { set: new Set([first, second]) }

      // when
      const result = produce(base, draft => {
        void [...draft.set]
        expect(draft.set.has(first)).toBe(true)
        draft.set.delete(first)
      })

      // then
      expect([...result.set]).toEqual([second])
    })
  })

  describe('=> Dates', () => {
    it('changes a date on a copy', () => {
      // given
      const date = new Date(2026, 0, 1)
      const base = { date }

      // when
      const result = produce(base, draft => {
        draft.date.setFullYear(2027)
        expect(draft.date.getFullYear()).toBe(2027)
      })

      // then
      expect(result.date).toBeInstanceOf(Date)
      expect(result.date.getFullYear()).toBe(2027)
      expect(date.getFullYear()).toBe(2026)
    })

    it('returns the base when the date does not change', () => {
      // given
      const base = { date: new Date(2026, 0, 1) }

      // when
      const result = produce(base, draft => {
        draft.date.setFullYear(2026)
        void String(draft.date)
      })

      // then
      expect(result).toBe(base)
    })
  })

  describe('=> Typed arrays', () => {
    it('changes a typed array on a copy', () => {
      // given
      const bytes = new Uint8Array([1, 2, 3])
      const base = { bytes }

      // when
      const result = produce(base, draft => {
        draft.bytes[0] = 10
        expect(draft.bytes[0]).toBe(10)
        draft.bytes.reverse()
        expect(draft.bytes.length).toBe(3)
      })

      // then
      expect(result.bytes).toBeInstanceOf(Uint8Array)
      expect([...result.bytes]).toEqual([3, 2, 10])
      expect([...bytes]).toEqual([1, 2, 3])
    })

    it('writes through a subarray to a copy', () => {
      // given
      const bytes = new Uint8Array([1, 2, 3, 4])
      const base = { bytes }

      // when
      const result = produce(base, draft => {
        draft.bytes.subarray(0, 2).fill(0)
      })

      // then
      expect([...result.bytes]).toEqual([0, 0, 3, 4])
      expect([...bytes]).toEqual([1, 2, 3, 4])
    })

    it('writes through the buffer to a copy', () => {
      // given
      const bytes = new Uint8Array([1, 2, 3])
      const base = { bytes }

      // when
      const result = produce(base, draft => {
        new Uint8Array(draft.bytes.buffer)[0] = 10
      })

      // then
      expect([...result.bytes]).toEqual([10, 2, 3])
      expect([...bytes]).toEqual([1, 2, 3])
    })

    it('returns the base when nothing changes', () => {
      // given
      const base = { bytes: new Float32Array([1, 2]) }

      // when
      const result = produce(base, draft => {
        draft.bytes[1] = 2
        void draft.bytes.map(value => value * 2)
      })

      // then
      expect(result).toBe(base)
    })
  })

  describe('=> Drafts', () => {
    it('moves a draft to another property', () => {
      // given
      const base: { a: { value: number }; b?: { value: number } } = {
        a: { value: 1 },
      }

      // when
      const result = produce(base, draft => {
        draft.b = draft.a
      })

      // then
      expect(result.b).toBe(base.a)
      expect(result.a).toBe(base.a)
    })

    it('finalizes the drafts nested in new values', () => {
      // given
      const base = {
        items: [{ id: 1 }, { id: 2 }],
        groups: new Map<string, { id: number }[]>(),
        selected: new Set<{ id: number }>(),
      }

      // when
      const result = produce(base, draft => {
        const [first, second] = draft.items
        second.id = 20
        draft.groups.set('all', [first, second])
        draft.selected.add(second)
      })

      // then
      const items = result.groups.get('all')!
      expect(items[0]).toBe(base.items[0])
      expect(items[1]).toBe(result.items[1])
      expect(items[1]).toEqual({ id: 20 })
      expect([...result.selected][0]).toBe(result.items[1])
    })

    it('finalizes the drafts nested in new maps and sets', () => {
      // given
      const base: {
        items: { id: number }[]
        map?: Map<string, { id: number }>
        set?: Set<{ id: number }>
      } = { items: [{ id: 1 }] }

      // when
      const result = produce(base, draft => {
        const [item] = draft.items
        item.id = 10
        draft.map = new Map([['item', item]])
        draft.set = new Set([item])
      })

      // then
      expect(result.map!.get('item')).toBe(result.items[0])
      expect([...result.set!][0]).toBe(result.items[0])
    })

    it('finalizes the drafts in new values with cycles', () => {
      // given
      type Node = { item?: { id: number }; self?: Node }
      const base: { items: { id: number }[]; node?: Node } = {
        items: [{ id: 1 }],
      }

      // when
      const result = produce(base, draft => {
        const node: Node = { item: draft.items[0] }
        node.self = node
        draft.node = node
      })

      // then
      expect(result.node!.item).toBe(base.items[0])
      expect(result.node!.self).toBe(result.node)
    })

    it('revokes the drafts once produced', () => {
      // given
      let leaked: { nested: { value: number } } | undefined

      // when
      produce({ nested: { value: 1 } }, draft => {
        leaked = draft
        void draft.nested
      })

      // then
      expect(() => leaked!.nested).toThrow(TypeError)
    })

    it('leaves the base unchanged when the recipe throws', () => {
      // given
      const base = { value: 1 }

      // when
      const produced = () =>
        produce(base, draft => {
          draft.value = 2
          throw new Error('Failed!')
        })

      // then
      expect(produced).toThrow('Failed!')
      expect(base).toEqual({ value: 1 })
    })

    describe('rejects other values', () => {
      const INVALID_VALUE =
        'The state can contain only primitives, functions, plain objects, arrays, maps, sets, dates and typed arrays'

      class Point {
        x = 1
      }

      it('as the base', () => {
        expect(() => produce(new Point(), () => {})).toThrow(INVALID_VALUE)
      })

      it('when read', () => {
        // given
        const base = { point: new Point(), map: new Map([['a', new Point()]]) }

        // then
        expect(() =>
          produce(base, draft => {
            draft.point.x = 2
          }),
        ).toThrow(INVALID_VALUE)
        expect(() =>
          produce(base, draft => {
            void draft.map.get('a')
          }),
        ).toThrow(INVALID_VALUE)
        expect(() =>
          produce({ set: new Set([new Point()]) }, draft => {
            void [...draft.set]
          }),
        ).toThrow(INVALID_VALUE)
        expect(base.point.x).toBe(1)
      })

      it('when assigned', () => {
        // given
        const base: Record<string, unknown> = {
          map: new Map(),
          set: new Set(),
        }

        // then
        expect(() =>
          produce(base, draft => {
            draft.point = new Point()
          }),
        ).toThrow(INVALID_VALUE)
        expect(() =>
          produce(base, draft => {
            draft.nested = { items: [Object.freeze(new Point())] }
          }),
        ).toThrow(INVALID_VALUE)
        expect(() =>
          produce(base, draft => {
            ;(draft.map as Map<string, unknown>).set('a', new Point())
          }),
        ).toThrow(INVALID_VALUE)
        expect(() =>
          produce(base, draft => {
            ;(draft.set as Set<unknown>).add(new DataView(new ArrayBuffer(1)))
          }),
        ).toThrow(INVALID_VALUE)
      })
    })
  })
})
