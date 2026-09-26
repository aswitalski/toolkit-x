import type { LogoProps, Positions } from './service.js'

export interface DemoState {
  logos: LogoProps[]
  config: { count: number }
}

const DemoCommands = {
  create: (logo: LogoProps) => (state: DemoState) => ({
    ...state,
    logos: [...state.logos, { ...logo, highlighted: false }],
  }),

  move: (positions: Positions) => (state: DemoState) => ({
    ...state,
    logos: state.logos.map(logo => ({ ...logo, ...positions[logo.id] })),
  }),

  destroy: (id: number) => (state: DemoState) => ({
    ...state,
    logos: state.logos.filter(logo => logo.id !== id),
  }),
}

export default DemoCommands
