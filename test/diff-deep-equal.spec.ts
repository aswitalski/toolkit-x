import Diff from '../src/core/diff.js'

describe('Diff => deep equal', () => {
  describe('not equal', () => {
    const notEqual: [unknown, unknown, string?, string?][] = [
      [undefined, null],
      [0, '0'],
      [false, 'false'],
      [true, 'true'],
      [
        parseInt,
        /* eslint-disable no-invalid-this */
        parseInt.bind(this),
        /* eslint-enable no-invalid-this */
        '[Function: parseInt]',
        '[Function: parseInt(bound)]',
      ],
      [{}, []],
      [{ a: 5 }, { a: '5' }],
      [{ a: { b: [] } }, { a: { b: {} } }],
      [
        { a: 'a', b: 'b' },
        { a: 'a', c: 'c' },
      ],
      [{ a: 1 }, { a: 1, b: undefined }, '{a:1}', '{a:1,b:undefined}'],
      [
        { a: 1, b: 2 },
        Object.defineProperty({ a: 1, c: 2 }, 'b', {
          value: 2,
          enumerable: false,
        }),
        '{a:1,b:2}',
        '{a:1,c:2} with non-enumerable b:2',
      ],
      [
        [0, 1, 2],
        [0, 2, 1],
      ],
      [
        [5, 1, 2, 7, {}],
        [5, 1, 2, 7, []],
      ],
      [
        [0, 0, 0],
        [0, 0],
      ],
      [
        [1, 0],
        [1, 0, null],
      ],
      [[9, 9], [9, 9, undefined], undefined, '[9,9,undefined]'],
      [new Date(1), new Date(2), 'Date(1)', 'Date(2)'],
      [new Map([['a', 1]]), new Map([['a', 2]]), 'Map(a => 1)', 'Map(a => 2)'],
      [new Map([['a', 1]]), new Map(), 'Map(a => 1)', 'Map()'],
      [new Set([1]), new Set([2]), 'Set(1)', 'Set(2)'],
      [
        Object.assign(Object.create(null), { a: 1 }),
        { a: 1 },
        'null prototype {a:1}',
        '{a:1}',
      ],
      [
        Object.assign(Object.create(null), { a: 1 }),
        Object.assign(Object.create(null), { a: 2 }),
        'null prototype {a:1}',
        'null prototype {a:2}',
      ],
      [new (class A {})(), new (class B {})(), 'new A()', 'new B()'],
      [
        { a: [{ b: 1 }, { c: 2 }] },
        { a: [{ c: 2 }, { b: 1 }] },
        '{a:[{b:1},{c:2}]}',
        '{a:[{c:2},{b:1}]}',
      ],
    ]

    notEqual.forEach(([v1, v2, d1, d2]) => {
      it(`${d1 || JSON.stringify(v1)} !== ${d2 || JSON.stringify(v2)}`, () => {
        assert(Diff.deepEqual(v1, v2) === false)
      })
    })
  })

  describe('equal', () => {
    const equal: [unknown, unknown, string?, string?][] = [
      [undefined, undefined],
      [null, null],
      [5, 5],
      [parseInt, parseInt, '[Function: parseInt]', '[Function: parseInt]'],
      [String, String, 'String', 'String'],
      [
        Symbol.for('test'),
        Symbol.for('test'),
        "Symbol.for('test')",
        "Symbol.for('test')",
      ],
      [[], []],
      [{}, {}],
      [{ a: { b: [1, 2, 3] } }, { a: { b: [1, 2, 3] } }],
      [{ a: 1 }, { a: 1 }],
      [
        { a: 1, b: { c: 2, d: 3 } },
        { b: { d: 3, c: 2 }, a: 1 },
      ],
      [new Date(1), new Date(1), 'Date(1)', 'Date(1)'],
      [new Date(NaN), new Date(NaN), 'Invalid Date', 'Invalid Date'],
      [new Map([['a', 1]]), new Map([['a', 1]]), 'Map(a => 1)', 'Map(a => 1)'],
      [new Set([{ a: 1 }]), new Set([{ a: 1 }]), 'Set({a:1})', 'Set({a:1})'],
      [
        Object.assign(Object.create(null), { a: 1, b: 2 }),
        Object.assign(Object.create(null), { b: 2, a: 1 }),
        'null prototype {a:1,b:2}',
        'null prototype {b:2,a:1}',
      ],
    ]

    equal.forEach(([v1, v2, d1, d2]) => {
      it(`${d1 || JSON.stringify(v1)} === ${d2 || JSON.stringify(v2)}`, () => {
        assert(Diff.deepEqual(v1, v2) === true)
      })
    })
  })
})
