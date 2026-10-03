import type { CommandsAPI } from 'toolkit'

import type { LogoProps, Positions } from './service.js'

export interface DemoState {
  logos: LogoProps[]
  config: { count: number }
}

const DemoCommands = {
  create(logo: LogoProps) {
    this.logos.push({ ...logo, highlighted: false })
  },

  move(positions: Positions) {
    for (const logo of this.logos) {
      Object.assign(logo, positions[logo.id])
    }
  },

  destroy(id: number) {
    this.logos = this.logos.filter(logo => logo.id !== id)
  },
} satisfies CommandsAPI<DemoState>

export default DemoCommands
