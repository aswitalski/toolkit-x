const Name = {
  INSERT: Symbol('insert'),
  MOVE: Symbol('move'),
  REMOVE: Symbol('remove'),
}

interface MoveProps {
  at?: number
  from?: number
  to?: number
}

class Move<T = unknown> {
  static Name = Name

  declare name: symbol
  declare item: T
  declare at?: number
  declare from?: number
  declare to?: number
  declare make: (items: T[]) => void

  constructor(
    name: symbol,
    item: T,
    props: MoveProps,
    make: (items: T[]) => void,
  ) {
    this.name = name
    this.item = item
    this.at = props.at
    this.from = props.from
    this.to = props.to
    this.make = make
  }

  static insert<T>(item: T, at: number): Move<T> {
    return new Move(Name.INSERT, item, { at }, items => {
      items.splice(at, 0, item)
    })
  }

  static move<T>(item: T, from: number, to: number): Move<T> {
    return new Move(Name.MOVE, item, { from, to }, items => {
      items.splice(from, 1)
      items.splice(to, 0, item)
    })
  }

  static remove<T>(item: T, at: number): Move<T> {
    return new Move(Name.REMOVE, item, { at }, items => {
      items.splice(at, 1)
    })
  }
}

/* The moves transforming the source into the target, with the result. */
export type Moves = Move<string>[] & { result?: string[] }

interface Item {
  key: string
  index: number
}

const Reconciler = {
  comparator(this: void, a: Item, b: Item): number {
    if (Object.is(a.key, b.key)) {
      return 0
    }
    return a.key > b.key ? 1 : -1
  },

  calculateMoves(
    source: string[],
    target: string[],
    favoredToMove: string | null = null,
  ): Moves {
    const moves: Moves = []

    const createItem = function (key: string, index: number): Item {
      return { key, index }
    }

    const before = source.map(createItem).sort(this.comparator)
    const after = target.map(createItem).sort(this.comparator)

    let removed: Item[] = []
    let inserted: Item[] = []

    while (before.length || after.length) {
      if (!before.length) {
        inserted = inserted.concat(after)
        break
      }
      if (!after.length) {
        removed = removed.concat(before)
        break
      }
      const result = this.comparator(after[0]!, before[0]!)
      if (result === 0) {
        before.shift()
        after.shift()
      } else if (result === 1) {
        removed.push(before.shift()!)
      } else {
        inserted.push(after.shift()!)
      }
    }

    const sortByIndex = function (foo: Item, bar: Item) {
      return foo.index - bar.index
    }

    removed.sort(sortByIndex).reverse()
    inserted.sort(sortByIndex)

    const result = [...source]

    for (const item of removed) {
      const move = Move.remove(item.key, item.index)
      move.make(result)
      moves.push(move)
    }
    for (const item of inserted) {
      const move = Move.insert(item.key, item.index)
      move.make(result)
      moves.push(move)
    }

    if (
      result.length === target.length &&
      result.every((key, index) => key === target[index])
    ) {
      moves.result = result
      return moves
    }

    const calculateIndexChanges = (
      source: string[],
      target: string[],
      reversed = false,
    ) => {
      const moves: Moves = []

      const moveItemIfNeeded = (index: number) => {
        const item = target[index]!
        if (source[index] !== item) {
          const from = source.indexOf(item)
          const move = Move.move(item, from, index)
          move.make(source)
          moves.push(move)
        }
      }

      if (reversed) {
        for (let i = target.length - 1; i >= 0; i--) {
          moveItemIfNeeded(i)
        }
      } else {
        for (let i = 0; i < target.length; i++) {
          moveItemIfNeeded(i)
        }
      }
      moves.result = source
      return moves
    }

    const defaultMoves = calculateIndexChanges([...result], target)
    if (
      defaultMoves.length > 1 ||
      (favoredToMove &&
        defaultMoves.length === 1 &&
        defaultMoves[0]!.item !== favoredToMove)
    ) {
      const alternativeMoves = calculateIndexChanges(
        [...result],
        target,
        /*= reversed */ true,
      )
      if (alternativeMoves.length <= defaultMoves.length) {
        moves.push(...alternativeMoves)
        moves.result = alternativeMoves.result
        return moves
      }
    }
    moves.push(...defaultMoves)
    moves.result = defaultMoves.result
    return moves
  },

  Move,
}

export default Reconciler
