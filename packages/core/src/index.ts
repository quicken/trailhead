/**
 * @herdingbits/trailhead-core
 * Core shell orchestration and services
 */

export { Trailhead } from './shell.js';
export type { ShellConfig } from './shell.js';
export type { NavItem, NavLink, NavSection, NavDivider, AppEntry, ShellManifest } from './types/shell-api.js';

// Adapter contracts are otherwise type-only (see @herdingbits/trailhead-types/adapters), but
// NoopAuthAdapter is a real runtime value — a types-only package can't carry it, so it's
// exported from here instead. Adapters already depend on trailhead-core as a peer dependency.
export { NoopAuthAdapter } from './adapters/types.js';
