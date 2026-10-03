# Toolkit X

Toolkit X is a lightweight library for building Web user interfaces as a composition of small, self-contained apps. You describe what the UI should look like for a given state, and Toolkit keeps the page in sync with it.

It originates from the Opera Web UI Toolkit.

## In a nutshell

- **Self-contained pieces** - each part of the UI owns its state, styles and behaviour, isolated from the rest of the page, so it can be built, tested and reused on its own.
- **Just JavaScript** - the UI is described with plain data and functions, with no template language to learn and no build step required.
- **Predictable state** - the state changes only in explicit, named steps, and the UI always reflects the current state.
- **Built on the platform** - it relies on what the browser already provides, like Web Components and ES modules, rather than working around it.
- **Mistakes caught early** - types and a debug mode point out errors in the UI while it is being written.
- **Extensible** - plugins add behaviour across all the apps, like logging, shared styles or helper methods, without changing them.

## Usage

```ts
import toolkit, { WebComponent, type Template } from 'toolkit-x'

type Props = { start: number }
type State = { count: number }

const CounterAPI = {
  increment() {
    return (state: State) => ({ ...state, count: state.count + 1 })
  },
}

class Counter extends WebComponent<Props, State, typeof CounterAPI> {
  static elementName = 'my-counter'

  static styles = ['styles/counter.css']

  static getCommands() {
    return CounterAPI
  }

  getInitialState(props: Props): State {
    return { count: props.start }
  }

  render(): Template {
    return [
      'button',
      { onClick: () => this.commands.increment() },
      `Clicked ${this.props.count} times`,
    ]
  }
}

await toolkit.render(Counter, document.body, { start: 0 })
```

The types are optional, the same component works in plain JavaScript without them.

Toolkit is also available as a single script, exposing the `toolkit` global:

```html
<script src="toolkit-0.69.0.js"></script>
```

### Configuration

Toolkit renders without the debug mode and plugins by default. Both can be configured at any time, also after rendering. Options not provided keep their current values. Changed plugins are uninstalled from the created roots and the new ones installed:

```ts
toolkit.configure({ debug: true, plugins: [plugin] })
```

## Components

Web Components render the content of an app, managing its state. Nested Web Components are rendered in their own custom elements.
Their state is created from the props in `getInitialState()` and updated with commands, or by the parent with `getUpdatedState()`.

Components render fragments of a Web Component from props, and pure components are just functions:

```ts
const Square = (props: { color: string; size: number }): Template => [
  'section',
  {
    class: 'square',
    style: {
      backgroundColor: props.color,
      height: [props.size, 'px'],
      width: [props.size, 'px'],
    },
  },
]
```

Both can define the `onCreated()`, `onAttached()`, `onPropsReceived()`, `onUpdated()`, `onDestroyed()` and `onDetached()` lifecycle methods.

Read more about [Bragi templates](BRAGI.md), the [Commands API](COMMANDS.md) and see a few [examples](EXAMPLES.md).

## TypeScript

Components are typed with their props, and their `render()` methods return a `Template`. Templates are type-checked, so misspelled props and attributes, unknown style properties or listeners of wrong event types are reported:

```ts
import { Component, type Template } from 'toolkit-x'

class Title extends Component<{ text: string }> {
  render(): Template {
    return ['h1', { class: 'title' }, this.props.text]
  }
}
```

Child templates passed to a component are available as `this.children`:

```ts
class Card extends Component<{ title: string }> {
  render(): Template {
    return ['section', ['h2', this.props.title], ...this.children]
  }
}
```

Web Components take the types of props, state and the Commands API: `WebComponent<Props, State, Commands>`.

## Build

```sh
npm run build
```

It creates:

- `dist/index.js` - an ES module with type declarations in `dist/index.d.ts`,
- `dist/toolkit-<version>.js` - a single script exposing the `toolkit` global,

both with source maps, and a declaration map leading editors to the TypeScript sources.

## Demo

```sh
npm run demo          # debug mode, using the sources
npm run demo:release  # release mode, using the ES module build
```

The debug mode uses the logger plugin, showing the executed commands, the patches applied to the DOM and the time taken by each update.

## Development

Toolkit requires Node 24, as defined in `.nvmrc`:

```sh
nvm use
npm install
npx playwright install chromium  # once, for running the tests
```

| Command                | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `npm test`             | runs the tests in Chromium with Vitest             |
| `npm run test:watch`   | runs the tests on every change                     |
| `npm run coverage`     | runs the tests with the coverage report            |
| `npm run bench`        | runs the benchmarks                                |
| `npm run typecheck`    | checks the types with TypeScript                   |
| `npm run lint`         | lints the code with ESLint                         |
| `npm run format`       | formats the code with Prettier                     |
| `npm run build`        | builds Toolkit into `dist`                         |
| `npm run update-opera` | builds and copies the single script to `$WORK_DIR` |
| `npm run watch`        | runs `update-opera` on every change                |

Git hooks format and lint the committed files, and run the checks and tests before pushing.
