import type { ComponentClass, WebComponent } from './nodes.js'
import type Plugins from './plugins.js'
import type { ItemType } from './template.js'
import { invariant } from './utils.js'

/*
 * The services of the Toolkit instance the core modules rely on,
 * provided by the instance, so that the modules do not import it.
 */
export interface Runtime {
  readonly plugins: Plugins | null
  assert(condition: unknown, message?: string): void
  isDebug(): boolean
  warn(...messages: unknown[]): void
  track(root: WebComponent): void
  resolveComponentClass(component: unknown, type: ItemType): ComponentClass
}

let provided: Runtime | null = null

export const provideRuntime = (runtime: Runtime) => {
  provided = runtime
}

export const runtime = (): Runtime => {
  invariant(provided, 'No Toolkit runtime provided!')
  return provided
}
