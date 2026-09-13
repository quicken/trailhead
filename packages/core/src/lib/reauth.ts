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

/**
 * Message shape posted on success, rather than a bare string — cheap insurance against an
 * unrelated same-origin feature that happens to also use a `BroadcastChannel` named
 * "trailhead-reauth" (or broadcasts the string "success" on it for some other reason)
 * accidentally satisfying a pending prompt here.
 *
 * This is not, and cannot be, a real security boundary: `BroadcastChannel` has no built-in way
 * to authenticate a same-origin sender, and this file's source is public. Any co-hosted script
 * — including a malicious or compromised one — already has the same DOM/JS access as this code
 * and can construct an identical message. Trailhead's whole model is multiple independent SPAs
 * sharing one origin and one `window.shell`; that shared trust boundary is what actually backs
 * this mechanism, not the message shape. If that's not an acceptable trust assumption for a
 * given deployment, don't co-host mutually-untrusted apps on the same origin — no in-page check
 * can substitute for that.
 */
interface ReauthSuccessMessage {
  channel: typeof CHANNEL_NAME;
  type: "success";
}

function isReauthSuccessMessage(data: unknown): data is ReauthSuccessMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as Partial<ReauthSuccessMessage>).channel === CHANNEL_NAME &&
    (data as Partial<ReauthSuccessMessage>).type === "success"
  );
}

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
          if (isReauthSuccessMessage(e.data)) resolve(true);
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
        channel?.postMessage({ channel: CHANNEL_NAME, type: "success" } satisfies ReauthSuccessMessage);
        return true;
      }
      errorMessage = "Incorrect username or password.";
      // loop — re-prompt with the error
    }
  }

  return { reauthenticate };
}
