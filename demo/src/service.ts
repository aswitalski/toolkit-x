export interface LogoProps {
  highlighted: boolean
  id: number
  radius: number
  x: number
  y: number
}

export type Positions = Record<number, Pick<LogoProps, 'x' | 'y'>>

const randomRadius = () => Math.random() * 0.08 + 0.08
const randomPosition = (radius: number) =>
  Math.random() * (0.9 - 2 * radius) + 0.05

const LogosService = {
  createLogo(id: number, x?: number, y?: number): LogoProps {
    const radius = randomRadius()
    return {
      highlighted: false,
      id,
      radius,
      x: x ? x - radius : randomPosition(radius),
      y: y ? y - radius : randomPosition(radius),
    }
  },

  createLogos(count: number): LogoProps[] {
    return new Array(count)
      .fill(null)
      .map((item, index) => this.createLogo(index))
  },

  moveLogos(logos: LogoProps[]): Positions {
    const positions: Positions = {}
    logos.forEach(logo => {
      positions[logo.id] = {
        x: randomPosition(logo.radius),
        y: randomPosition(logo.radius),
      }
    })
    return positions
  },
}

export default LogosService
