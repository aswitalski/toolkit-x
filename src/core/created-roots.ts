import type { WebComponent } from './nodes.js'

/* The roots created by the function called by destroyingRootsOnError(). */
let createdRoots: WebComponent[] | null = null

const CreatedRoots = {
  /**
   * Calls the function, destroying the roots it creates when it throws.
   * They are neither attached nor destroyed by the lifecycle then, but
   * would stay tracked, with the plugins installed.
   */
  destroyingRootsOnError<T>(fn: () => T): T {
    const outerRoots = createdRoots
    const roots: WebComponent[] = []
    createdRoots = roots
    try {
      const result = fn()
      outerRoots?.push(...roots)
      return result
    } catch (error) {
      for (const root of roots.reverse()) {
        root.destroy()
      }
      throw error
    } finally {
      createdRoots = outerRoots
    }
  },

  /**
   * Records a root being created, see destroyingRootsOnError().
   */
  collectRoot(root: WebComponent) {
    createdRoots?.push(root)
  },
}

export default CreatedRoots
