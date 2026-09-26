## Examples

Toggle rendered within a custom element:

```js
import { WebComponent } from 'toolkit-x'

class Toggle extends WebComponent {
  static elementName = 'opr-toggle'

  static styles = ['styles/toggle.css']

  getInitialState(props) {
    return {
      id: props.id,
      value: Settings.getValue(props.id),
    }
  }

  onAttached() {
    this.connectTo(Settings, {
      [this.props.id]: this.onValueChanged,
    })
  }

  onValueChanged(value) {
    this.commands.update({
      value,
    })
  }

  render() {
    return [
      'input',
      {
        type: 'checkbox',
        class: 'toggle',
        checked: this.props.value === true,
      },
    ]
  }
}
```

Impression reporter wrapper:

```js
class ImpressionReporter extends WebComponent {
  onVisible() {
    // called by the intersection observer plugin
    Stats.reportImpression(this.props.id)
  }

  render() {
    return this.children[0]
  }
}
```

Animation decorator:

```js
class Animation extends WebComponent {
  getInitialState(props) {
    return {
      ...props,
      animation: 'fade-in',
    }
  }

  getUpdatedState(props, state) {
    return {
      ...props,
      animation: 'shake',
    }
  }
}
```

Image details information with asynchronous state update:

```js
class ImageDetails extends WebComponent {
  static elementName = 'image-details'

  async getInitialState({ url }) {
    const metadata = await Service.getImageMetadata(url)
    return {
      url,
      metadata,
    }
  }

  render() {
    return [
      'section',
      ['img', { src: this.props.url }],
      ['span', `Width: ${this.props.metadata.width}`],
      ['span', `Height: ${this.props.metadata.height}`],
      ['span', `File size: ${format(this.props.metadata.size)}`],
    ]
  }
}
```
