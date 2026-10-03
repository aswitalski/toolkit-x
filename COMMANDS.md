## Commands API

Commands API is a part of the dedicated state management mechanism for Toolkit.
It allows transitioning the Web Component's view model from one state to another with simple API calls.

As in Redux, the state is immutable and changes only in explicit, named steps, but the focus is on the API, code clarity (no boilerplate) and convenience for the client. Commands are written as if the state was mutable, and Toolkit turns the changes they make into a new immutable state, as Immer does.

### All about the API

The implementation of Commands API is just a creation of a plain object declaring API methods. These methods take arbitrary domain-specific arguments and change the current state, available as `this`.

```js
const API = {
  setPersonalData(name, surname) {
    this.name = name
    this.surname = surname
  },
}
```

The commands need to be regular methods, as arrow functions have no `this` of their own.

As `this` is the state, not the API object, commands cannot call each other. The logic shared by commands can be moved to functions taking the state:

```js
const addItem = (state, item) => {
  state.items.push(item)
  state.count = state.items.length
}

const ListCommands = {
  add(item) {
    addItem(this, item)
  },
  addAll(items) {
    items.forEach(item => addItem(this, item))
  },
}
```

Once connected to a Web Component, the command can be issued from component methods:

```js
import { WebComponent } from 'toolkit-x'

class FormComponent extends WebComponent {
  static commands = API

  onPersonalDataChange({ name, surname }) {
    this.commands.setPersonalData(name, surname)
  }
}
```

Such call triggers the component state update and the DOM update, if necessary.

### Core commands

Every Web Component has two core commands, also when it has no Commands API:

- `update(overrides)` merges the given properties into the current state, keeping the other ones.
- `replace(state)` replaces the whole state with the given object.

```js
this.commands.update({ selected: id })
this.commands.replace({ items: [], selected: null })
```

Their names are reserved, so creating a component with a Commands API defining `update` or `replace` throws an error.

### Under the hood

Issuing the command calls its method with a draft of the current state of the component as `this`, and the arguments the command was issued with. The draft is a proxy intercepting all the changes, like setting, incrementing or deleting a property, pushing an item to an array or adding one to a map or set. The nested objects get drafts of their own when accessed.

The changes are recorded on shallow copies of the changed objects, so the current state is left untouched. Once the method returns, the copies become the new state object, sharing all the unchanged parts with the previous one, which is then set on the component instance.

If the new state object differs from the previous one, the `render()` method is called on the component to calculate the new template and if that altered from the previously rendered one, both the virtual and actual DOM will be patched to reflect the changes.

If the command changes nothing, the state object stays the same and no action is taken.

When the command throws, the state stays the same as well. The commands executed in the same update, issued together with the failed one, are rejected with its error and their changes are not applied either.

### Immutable data

The state of the component is never modified, each change creates a new state object. It may contain only primitives and the built-in JavaScript types:

- plain objects, arrays, maps, sets, dates and typed arrays are drafted, so commands can change them in place,
- primitives and functions are kept as they are, so commands can only replace them.

Commands throw when they read or assign other values, like class instances or DOM elements. Such objects should be kept outside the state, e.g. in services, with only the data they provide stored in the state.

The draft is only available while the command runs, so commands are synchronous. An async command is rejected with an error and leaves the state unchanged, as the draft is closed before the code after an `await` runs.

### Comparing objects

The objects read from `this` are drafts, not the objects of the current state. An object passed to a command, e.g. an item from `this.props`, is the original one, so comparing it with the items of a draft fails:

```js
const TodoCommands = {
  remove(item) {
    // the drafts are never equal to the item
    this.items = this.items.filter(other => other !== item)
  },
}
```

Commands should take ids instead and compare by them:

```js
const TodoCommands = {
  remove(id) {
    this.items = this.items.filter(item => item.id !== id)
  },
}
```

The `indexOf()`, `lastIndexOf()` and `includes()` methods of the drafted arrays match the original objects as well as the drafts, so `this.items.indexOf(item)` finds the item. The same applies to `has()` and `delete()` of the drafted sets.

Changing an object passed to a command changes the current state, which needs to stay immutable, so the changes should always be made through `this`.

### Execution

Commands are usually issued on either user actions or underlying data changes. They are queued and the ones issued together, in the same synchronous run of code, are executed in a single update once it has completed. The commands issued after an `await` or in a separate event listener are executed in a separate update.

Every command returns a promise, resolved with `true` once both virtual and the actual DOM are updated, or with `false` when the command is ignored, as after the component is destroyed. When the update fails, the promise is rejected with the error. An update is still completed when lifecycle methods throw, and when more of them throw, the promise is rejected with an `AggregateError` of all their errors.

```js
await this.commands.update({ selected: id })
// the DOM shows the selected item
```

They may also be called from the component's lifecycle methods, in the middle of the state transition. In such case they are executed in the next update, once the current one has completed, also when it fails. Toolkit also detects if such cycles do not cause infinite update loops.

### Example

```js
import { WebComponent } from 'toolkit-x'

const StackCommands = {
  push(item) {
    this.items.push(item)
  },
  pop() {
    this.removed = this.items.pop()
  },
}

export default class Stack extends WebComponent {
  static commands = StackCommands

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
The static `commands` property may hold an array containing many command objects.

```js
class FormComponent extends WebComponent {
  static commands = [FooCommands, BarCommands]
}
```

In such case the specified APIs are checked for any potential name conflicts.
If none are detected, the component will be able to utilize all the defined methods.

When responsibilities are divided correctly and command names are descriptive enough, conflicts should happen very rarely, if ever.

### TypeScript

The API is typed with the state it changes, using `satisfies CommandsAPI<State>`, which types `this` in its methods. Without it, `this` is the API object itself, so accessing the state is reported as an error.

```ts
import { type CommandsAPI, WebComponent } from 'toolkit-x'

interface StackState {
  items: number[]
}

const StackCommands = {
  push(item: number) {
    this.items.push(item)
  },
} satisfies CommandsAPI<StackState>
```

Misspelled state properties and values of wrong types are reported in the commands, as `this` is typed with the state.

Web Components take the types of props, state and the Commands API, so the commands are called with the arguments of the API methods, and an API typed with a different state is reported:

```ts
class Stack extends WebComponent<object, StackState, typeof StackCommands> {
  static commands = StackCommands

  onAttached() {
    this.commands.push(1) // returns Promise<boolean>
    this.commands.push('1') // error: the argument must be a number
  }
}
```

### Testing

Since all the state management logic is within the API object, it's extremely easy to debug and unit test it. The commands can be called with a plain state object as `this`, to check the changes made to it.

```js
it('pushes the item to the stack', () => {
  // given
  const state = {
    items: [1, 2, 3],
  }

  // when
  StackCommands.push.call(state, 10)

  // then
  assert.deepEqual(state.items, [1, 2, 3, 10])
})
```

Such tests call the commands without a draft, so they check the changes, but not the rules of the drafts, like comparing the objects passed to the commands with the ones in the state. Rendering the component and issuing the commands tests them as they run in the app:

```js
it('pushes the item to the stack', async () => {
  // given
  const stack = await toolkit.render(Stack, container)

  // when
  await stack.commands.push(10)

  // then
  assert.deepEqual(stack.state.items, [10])
})
```
