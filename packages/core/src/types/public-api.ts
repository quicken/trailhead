/**
 * Public Shell API - Only these types are exposed to plugin applications
 * This file explicitly defines what's public vs internal
 */

export type {
  ShellAPI,
  ShellPlugin,
  FeedbackAPI,
  AlertVariant,
  HttpAPI,
  RequestOptions,
  Result,
  SuccessResult,
  ErrorResult,
  HttpError,
  NavigationAPI,
  NavItem,
  NavLink,
  NavSection,
  NavDivider,
  AppEntry,
  ShellManifest,
} from "./shell-api.js";
