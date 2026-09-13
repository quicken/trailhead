/**
 * In-place session re-authentication.
 *
 * Lets a product recover from an expired session without a full page reload — the app calls
 * `reauthenticate(attempt)` when a request fails due to expiry; this shows a credential prompt
 * (via the configured `AuthAdapter`), retries `attempt` until it succeeds or the user cancels,
 * and keeps every open browser tab in sync so re-authenticating in one tab resolves a pending
 * prompt in every other tab too.
 */
import type { AuthAdapter } from "../adapters/types.js";

const CHANNEL_NAME = "trailhead-reauth";

export interface Reauthenticator {
  /**
   * Prompts for credentials and calls `attempt` with them, re-prompting (with an error message)
   * on failure, until `attempt` succeeds or the user cancels. Concurrent callers share a single
   * in-flight prompt rather than each showing their own.
   *
   * @param attempt - Validates one username/password pair against the product's own login
   *   endpoint and returns whether it succeeded. `AuthAdapter` and this orchestrator never see
   *   or know about the actual authentication mechanism.
   * @returns `true` once a session has been re-established (by this tab or another one),
   *   `false` if the user cancelled.
   */
  reauthenticate(attempt: (username: string, password: string) => Promise<boolean>): Promise<boolean>;
}

/**
 * Creates a `Reauthenticator` backed by the given adapter. Pass `NoopAuthAdapter` (or any
 * adapter that never actually prompts) to disable re-authentication entirely — `reauthenticate`
 * then always resolves `false`, and callers fall through to whatever they'd otherwise do when a
 * session expires.
 */
export function createReauthenticator(adapter: AuthAdapter): Reauthenticator {
  let inFlight: Promise<boolean> | null = null;
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;

  function reauthenticate(attempt: (username: string, password: string) => Promise<boolean>): Promise<boolean> {
    if (inFlight) return inFlight;
    inFlight = run(attempt).finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  async function run(attempt: (username: string, password: string) => Promise<boolean>): Promise<boolean> {
    let errorMessage: string | undefined;

    while (true) {
      const prompt = adapter.promptCredentials(errorMessage);

      let onMessage: ((e: MessageEvent) => void) | null = null;
      const otherTabSucceeded = new Promise<true>((resolve) => {
        if (!channel) return; // no BroadcastChannel support — never resolves, harmless
        onMessage = (e) => {
          if (e.data === "success") resolve(true);
        };
        channel.addEventListener("message", onMessage);
      });

      const outcome = await Promise.race([
        prompt.result.then((credentials) => ({ kind: "prompt" as const, credentials })),
        otherTabSucceeded.then(() => ({ kind: "other-tab" as const, credentials: null })),
      ]);

      if (onMessage && channel) channel.removeEventListener("message", onMessage);

      if (outcome.kind === "other-tab") {
        prompt.close();
        return true;
      }
      if (outcome.credentials === null) {
        return false; // user cancelled
      }

      const ok = await attempt(outcome.credentials.username, outcome.credentials.password);
      if (ok) {
        channel?.postMessage("success");
        return true;
      }
      errorMessage = "Incorrect username or password.";
      // loop — re-prompt with the error
    }
  }

  return { reauthenticate };
}
