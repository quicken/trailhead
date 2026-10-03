/**
 * Web Awesome Shell App
 * Starts the shell against the static layout in the page's HTML
 */
import type { Trailhead } from '@herdingbits/trailhead-core';

export class ShellApp {
  /**
   * Mount the shell. Web Awesome's layout (`#shell-navigation`, `#shell-content`) is static
   * HTML that's already in the DOM, so this starts the shell straight away: when it returns,
   * navigation is rendered and the current app is loading.
   */
  static mount(shell: Trailhead): void {
    shell.start();
    console.log('[Trailhead] Web Awesome shell mounted');
  }
}
