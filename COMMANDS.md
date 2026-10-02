## Commands API

Commands API is a part of the dedicated state management mechanism for Toolkit.
It allows to transition the Web Component's view model from one state to another with simple API calls.

The concept is based on reducer functions as Redux but is more focused on the API, code clarity (no boilerplate) and convenience for the client.

### All about the API

The implementation of Commands API is just a creation of a plain object declaring API methods. These methods take arbitrary domain-specific arguments and return a reducer function defining how given command call transforms the current state to the updated one.

```js
const API = {
  setPersonalData(name, surname) {
    return state => ({
      ...state,
      name,
      surname,
    })
  },
}
```

Once connected to a Web Component, the command can be issued from component methods:

```js
import { WebComponent } from 'toolkit-x'

class FormComponent extends WebComponent {
  static getCommands() {
    return API
  }

  onPersonalDataChange({ name, surname }) {
    this.commands.setPersonalData(name, surname)
  }
}
```

Such call triggers the component state update and the DOM update, if necessary.

### Under the hood

Issuing the command causes the returned reducer function to be invoked on the current state of the component. The reducer also has access to the arguments the command was issued with. The result of that reducer call, the newly calculated state object, is then set on the component instance.

If the new state object differs from the previous one, the `render()` method is called on the component to calculate the new template and if that altered from the previously rendered one, both the virtual and actual DOM will be patched to reflect the changes.

If the reducer function returns the same object or it is equal to the previous one (deep comparison) no action is taken.

### Immutable data

Since the state comparison checks the deep equality of the objects, all the used data needs to be immutable. Modifying the existing state object may result in unpredictable behaviour, so the reducers should always return new objects.

### Execution

Commands are usually issued on either user actions or underlying data changes. They are queued and the ones issued together, in the same synchronous run of code, are executed in a single update once it has completed. The commands issued after an `await` or in a separate event listener are executed in a separate update.

Every command returns a promise, resolved with `true` once both virtual and the actual DOM are updated, or with `false` when the command is ignored, as after the component is destroyed. When the update fails, the promise is rejected with the error. An update is still completed when lifecycle methods throw, and when more of them throw, the promise is rejected with an `AggregateError` of all their errors.

```js
await this.commands.update({ selected: id })
// the DOM shows the selected item
```

They may also be called from the component's lifecycle methods, in the middle of the state transition. In such case they are executed in the next update, once the current one has completed. Toolkit also detects if such cycles do not cause infinite update loops.

### Example

```js
import { WebComponent } from 'toolkit-x'

const StackCommands = {
  push(item) {
    return state => ({
      items: [...state.items, item],
    })
  },
  pop() {
    return state => {
      const items = [...state.items]
      const removed = items.pop()
      return {
        items,
        removed,
      }
    }
  },
}

export default class Stack extends WebComponent {
  static getCommands() {
    return StackCommands
  }

  getInitialState() {
    return {
      items: [],
    }
  }

  pushItem() {
    const item = Math.floor(256 * Math.random())
    console.log('Pushing item:', item)
    this.commands.push(item)
  }

  async popItem() {
    await this.commands.pop()
    console.log('Removed item:', this.props.removed)
  }
}
```

### Using multiple APIs

Web Components can use multiple Command APIs at the same time.
The static `getCommands()` method may return an array containing many command objects.

```js
class FormComponent extends WebComponent {
  static getCommands() {
    return [FooCommands, BarCommands]
  }
}
```

In such case the specified APIs are checked for any potential name conflicts.
If none are detected, the component will be able to utilize all the defined methods.

When responsibilities are divided correctly and command names are descriptive enough, conflicts should happen very rarely, if ever.

### TypeScript

Web Components take the types of props, state and the Commands API, so the commands are called with the arguments of the API methods:

```ts
class Stack extends WebComponent<object, StackState, typeof StackCommands> {
  static getCommands() {
    return StackCommands
  }
}
```

### Testing

Since all the state management logic is within the API object, it's extremely easy to debug and unit test it.

```js
it('pushes the item to the stack', () => {
  // given
  const item = 10
  const state = {
    items: [1, 2, 3],
  }

  // when
  const reducer = StackCommands.push(item)
  const result = reducer(state)

  // then
  assert(result !== state)
  assert.deepEqual(result.items, [1, 2, 3, 10])
})
```
