/**
 * Redirect-based session recovery.
 *
 * Where {@link ./reauth.ts | reauth.ts} recovers an expired session *in place* by collecting a
 * username and password (the app owns the login endpoint — nginx/Lucee), this module recovers a
 * session the app can never see the credentials for: a hosted-UI identity provider (e.g. Cognito
 * Managed Login) sitting at the edge, where tokens live in `HttpOnly` cookies and the only levers
 * the app has are "ask the edge to refresh" and "redirect to sign-in".
 *
 * The behaviour mirrors the `withSession()` helper documented in the jwt-auth-gateway README:
 *
 * 1. `POST` the refresh endpoint (default `/_auth/refresh`).
 * 2. On a `204`/`2xx`, the edge set a fresh id-token cookie — resolve `true` so the caller retries.
 * 3. Otherwise redirect to the sign-in endpoint (default `/_auth/signin`) with the current path
 *    (`location.pathname + location.search`) as the `return` query param, and never resolve
 *    (the page is navigating away).
 *
 * Core stays identity-provider-agnostic: the only knowledge baked in is the two gateway default
 * paths, both overridable. No tenant, pool, client id or hosted-UI URL ever reaches core.
 */

/**
 * Side effects this module performs on the browser, isolated behind an interface so vitest can
 * exercise the 204-refresh, refresh-401-redirect and network-failure paths under jsdom (or even
 * node) without a real navigation. Mirrors the `BroadcastChannel` seam in `reauth.ts`.
 */
export interface SessionRecoveryEnvironment {
  /** Performs the refresh request. Defaults to `window.fetch`. */
  fetch: typeof fetch;
  /** Redirects the browser. Defaults to `window.location.assign`. Expected not to return. */
  redirect: (url: string) => void;
  /** Current path+query used to build the sign-in `return`. Defaults to `location.pathname + location.search`. */
  currentPath: () => string;
}

/** Options for {@link createRedirectSessionRecovery}. */
export interface RedirectSessionRecoveryOptions {
  /**
   * Endpoint `POST`ed to refresh the edge session. A `2xx` means the session was refreshed in
   * place. Default `"/_auth/refresh"` (the jwt-auth-gateway default).
   */
  refreshPath?: string;
  /**
   * Endpoint redirected to when a refresh fails. The current path is appended as a `return`
   * query param. Default `"/_auth/signin"` (the jwt-auth-gateway default).
   */
  signinPath?: string;
  /** Overridable browser seams; real `window` behaviour is used for any left unset. */
  env?: Partial<SessionRecoveryEnvironment>;
}

/**
 * Recovers an expired session by refreshing at the edge, or redirecting to sign-in. The public
 * shape behind `shell.auth.recoverSession`.
 */
export interface SessionRecoverer {
  /**
   * Attempts to recover the current session.
   *
   * @returns `true` when the session was refreshed in place and the caller should retry the
   *   original request. Resolves `false` only when a redirect could not be performed (no browser
   *   navigation available, e.g. under test with a `redirect` seam that returns); in a real
   *   browser the returned promise never resolves on the failure path, because the page is
   *   already navigating to sign-in.
   */
  recoverSession(): Promise<boolean>;
}

function defaultEnvironment(): SessionRecoveryEnvironment {
  return {
    fetch: (...args) => fetch(...args),
    redirect: (url) => window.location.assign(url),
    currentPath: () => window.location.pathname + window.location.search,
  };
}

/**
 * Creates a {@link SessionRecoverer} that recovers via refresh-or-redirect against a hosted-UI
 * edge gateway.
 *
 * @param options - Endpoint overrides and injectable browser seams. The gateway defaults
 *   (`/_auth/refresh`, `/_auth/signin`) apply when the paths are omitted.
 */
export function createRedirectSessionRecovery(options: RedirectSessionRecoveryOptions = {}): SessionRecoverer {
  const refreshPath = options.refreshPath ?? "/_auth/refresh";
  const signinPath = options.signinPath ?? "/_auth/signin";
  const env: SessionRecoveryEnvironment = { ...defaultEnvironment(), ...options.env };

  async function recoverSession(): Promise<boolean> {
    let refreshed = false;
    try {
      const response = await env.fetch(refreshPath, { method: "POST" });
      refreshed = response.ok;
    } catch {
      // Network failure reaching the refresh endpoint — treat as "could not refresh" and fall
      // through to the sign-in redirect, exactly as the README's withSession() does.
      refreshed = false;
    }

    if (refreshed) {
      return true;
    }

    const returnTo = encodeURIComponent(env.currentPath());
    env.redirect(`${signinPath}?return=${returnTo}`);
    return false;
  }

  return { recoverSession };
}
