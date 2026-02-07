/**
 * Shoelace Shell App
 * Minimal wrapper for consistency with other adapters
 */
import type { Trailhead } from '@herdingbits/trailhead-core';

export class ShellApp {
  /**
   * Mount the shell (no-op for Shoelace since adapter handles everything)
   */
  static mount(shell: Trailhead): void {
    // Shoelace adapter handles all UI via web components
    // This is just a consistent API surface
    console.log('[Trailhead] Shoelace shell mounted');
  }
}
