/**
 * Web Awesome Shell App
 * Minimal wrapper for consistency with other adapters
 */
import type { Trailhead } from '@herdingbits/trailhead-core';

export class ShellApp {
  /**
   * Mount the shell (no-op for Web Awesome since the adapter handles everything)
   */
  static mount(shell: Trailhead): void {
    // Web Awesome adapter handles all UI via web components
    // This is just a consistent API surface
    console.log('[Trailhead] Web Awesome shell mounted');
  }
}
