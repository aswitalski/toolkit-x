import { type Template, WebComponent } from 'toolkit'

import type { LogoProps } from './service.js'

type Channel = 'developer' | 'beta' | 'stable'

interface LogoState extends LogoProps {
  channel: Channel
}

const getNextChannel = (current: Channel): Channel =>
  current === 'developer' ? 'beta' : 'stable'

class Logo extends WebComponent<LogoProps, LogoState> {
  static elementName = 'logo-component'

  static styles = ['styles/logo.css']

  async getInitialState(props: LogoProps): Promise<LogoState> {
    return {
      ...props,
      channel: 'developer',
    }
  }

  onClick(event: MouseEvent) {
    void this.commands.update({
      channel: getNextChannel(this.props.channel),
    })
    event.stopImmediatePropagation()
    event.preventDefault()
  }

  render(): Template {
    return [
      'logo',
      {
        style: {
          background: `url('/images/${this.props.channel}.svg')`,
        },
        attrs: {
          channel: this.props.channel,
        },
        onClick: this.onClick,
      },
    ]
  }
}

export default Logo
