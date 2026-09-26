# Toolkit X

Toolkit X is a UI library created for rendering Opera Desktop browser's internal Web pages.
It allows to build the user interface natively by utilising the engine's latest features.

## Why?

All JavaScript frameworks are intended for rendering Web pages which work across a variety of browsers with diversified support for latest HTML5+ features. That results in compromises and requires a number of techniques to make this possible - transpilation, polyfills, external live-reload servers to name a few.

A solution dedicated for a single browser asks for a different approach, an attempt to use as many tools provided by the browser itself as possible. Support for async/await, object spread and other syntactic sugar allows to write nifty apps without any need of transpilation. Native templating system makes possible to describe rendered DOM elements and components with arrays and objects. Single execution environment pushes away the worries of browser compatibility issues. DevTools workspaces provide built-in live reload system, neither external tools nor constant builds and browser restarts are necessary.

## Design principles

- **native** - take advantage of the latest Chromium engine features,
- **modular** - define each component, reducer, service as a separate module,
- **dynamic** - build in discovery service, lazy-load modules for flexibility or preload for performance,
- **fast** - utilise virtual DOM, minimise the number of DOM modifications, benchmark all operations to ensure high performance,
- **simple** - no millions of callbacks and events, utilise one-way model-to-view binding and unidirectional data flow,
- **encapsulated** - isolate apps as Web components, reduce usage of global variables to bare minimum,
- **deterministic** - do not worry about race conditions, let the framework control the asynchronous operations properly,
- **testable** - unit test all your components with little effort,
- **debuggable** - easily inspect your apps, use live reload, instrumentation and time saving debug tools.

## Web Apps

Toolkit renders Web Apps as a composition of Web Components encapsulated within custom elements.
Web Components manage their own state, use isolated stylesheets, provide rendering context with Commands API and support plugins.

Toolkit also encourages functional programming by utilizing pure functions and pure components.
These components always generate the same template when given the same props object.

```js
const Square = props => [
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

Apps need no transpilation phase, their sources are directly used by the browser in the form of ES modules.
Toolkit itself is written in TypeScript and is used in its built form, as an ES module or a single script.

## State management

Instead of using the centralized state, as in Redux, Web Component manages only the view model that is necessary
to render the particular fragment of the UI it is responsible for.

There is no need to traverse and clone complex data structures in order to amend the state.
By design Web Components are small, single-purpose nestable apps. Their state is based on the props received from the parent.
They can fetch the additional data asynchronously and handle the data changes themselves. The ancestor Web Components are not involved when not interested in that data.

Web Components use commands to make a transition between one state and another.

Read more about the [Commands API](COMMANDS.md).

## Templating

Toolkit uses **Bragi** templates, which allow to express HTML nodes with pure JavaScript code, using only objects, arrays and primitive types.

Find out more about [Bragi templates](BRAGI.md)

## TypeScript

Toolkit provides types for Bragi templates and components. Templates returned from `render()` are type-checked,
so misspelled props and attributes, unknown style properties or listeners of wrong event types are reported:

```ts
import { Component, type Template } from 'toolkit-x'

class Title extends Component<{ text: string }> {
  render(): Template {
    return ['h1', { class: 'title' }, this.props.text]
  }
}
```

The `render()` methods need the `Template` return type, as TypeScript does not infer it from the base class.
Child templates passed to a component are available as `this.children`:

```ts
class Card extends Component<{ title: string }> {
  render(): Template {
    return ['section', ['h2', this.props.title], ...this.children]
  }
}
```

Web Components take the types of props, state and the Commands API: `WebComponent<Props, State, Commands>`.

## Examples

Here are a few conceptual examples of [Web Components](EXAMPLES.md)

## Usage

Toolkit is available as an ES module:

```js
import toolkit, { WebComponent } from 'toolkit-x'

class App extends WebComponent {
  static elementName = 'my-app'

  render() {
    return ['main', 'Hello!']
  }
}

toolkit.configure({ debug: true })
await toolkit.render(App, document.body)
```

or as a single script, exposing the Toolkit as the `opr.Toolkit` global:

```html
<script src="toolkit-0.69.0.js"></script>
```

## Build

To build Toolkit run:

```
npm run build
```

It creates:

- `dist/index.js` - an ES module with type declarations in `dist/index.d.ts`,
- `dist/toolkit-<version>.js` - a single script exposing the `opr.Toolkit` global, with no external dependencies,

both with source maps, and a declaration map leading editors to the TypeScript sources.

## Demo

A simple demo in both `debug` and `release` mode:

```sh
npm run demo          # debug mode, using the sources
npm run demo:release  # release mode, using the ES module build
```

The debug mode uses the logger plugin showing all executed commands, patches applied on the DOM and time taken on each operation.

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
