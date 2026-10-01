import { type Template, WebComponent } from 'toolkit'

import DemoCommands, { type DemoState } from './commands.js'
import Logo from './logo.js'
import service from './service.js'

class Demo extends WebComponent<object, DemoState, typeof DemoCommands> {
  static displayName = 'Demo'

  static elementName = 'pretty-useless-demo'

  static styles = ['styles/demo.css']

  static getCommands() {
    return DemoCommands
  }

  async getInitialState(): Promise<DemoState> {
    const count = 1
    return {
      logos: service.createLogos(count),
      config: { count },
    }
  }

  onBackgroundClick(event: MouseEvent) {
    const id = this.props.logos.length
      ? Math.max(...this.props.logos.map(logo => logo.id)) + 1
      : 0
    const target = event.target as HTMLElement
    const x = event.offsetX / target.offsetWidth
    const y = event.offsetY / target.offsetHeight
    void this.commands.create(service.createLogo(id, x, y))
  }

  onDoubleClick(event: MouseEvent) {
    const target = event.target as HTMLElement
    const id = parseInt((target.parentNode as HTMLElement).id)
    void this.commands.destroy(id)
  }

  render(): Template {
    return [
      'main',
      {
        onClick: this.onBackgroundClick,
      },
      ...this.props.logos.map(
        props =>
          [
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
          ] as const,
      ),
    ]
  }
}

export default Demo
