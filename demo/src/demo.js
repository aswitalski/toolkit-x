import { Root } from 'toolkit'

import Logo from './logo.js'
import reducer from './reducer.js'
import service from './service.js'

class Demo extends Root {
  static displayName = 'Demo'

  static elementName = 'pretty-useless-demo'

  static styles = ['styles/demo.css']

  getReducers() {
    return [reducer]
  }

  async getInitialState() {
    const count = 1
    return {
      logos: service.createLogos(count),
      config: { count },
    }
  }

  onBackgroundClick(event) {
    let id = this.props.logos.length
      ? Math.max(...this.props.logos.map(logo => logo.id)) + 1
      : 0
    const x = event.offsetX / event.target.offsetWidth
    const y = event.offsetY / event.target.offsetHeight
    this.commands.create(service.createLogo(id, x, y))
  }

  onDoubleClick(event) {
    const id = parseInt(event.target.parentNode.id)
    this.commands.destroy(id)
  }

  render() {
    return [
      'main',
      {
        onClick: this.onBackgroundClick,
        // onDoubleClick: this.onDoubleClick,
      },
      ...this.props.logos.map(props => [
        'section',
        {
          key: props.id,
          id: props.id,
          style: {
            width: [props.radius * 200, '%'],
            height: [props.radius * 200, '%'],
            left: [props.x * 100, '%'],
            top: [props.y * 100, '%'],
          },
        },
        [
          Logo,
          {
            ...props,
            attrs: {
              lastModified: Date.now(),
              id: props.id,
            },
          },
        ],
      ]),
    ]
  }
}

export default Demo
