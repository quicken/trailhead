import { describe, it, expect, vi } from 'vitest';
import { createReauthenticator } from '../src/lib/reauth.js';
import { NoopAuthAdapter, type AuthAdapter, type CredentialPromptHandle, type Credentials } from '../src/adapters/types.js';

/** A controllable fake AuthAdapter — each prompt is resolved/cancelled manually by the test. */
function createFakeAdapter() {
  const prompts: Array<{ errorMessage?: string; resolve: (c: Credentials | null) => void; closed: boolean }> = [];

  const adapter: AuthAdapter = {
    promptCredentials(errorMessage?: string): CredentialPromptHandle {
      let resolveFn!: (c: Credentials | null) => void;
      const result = new Promise<Credentials | null>((resolve) => {
        resolveFn = resolve;
      });
      const entry = { errorMessage, resolve: resolveFn, closed: false };
      prompts.push(entry);
      return {
        result,
        close: () => {
          entry.closed = true;
          resolveFn(null);
        },
      };
    },
  };

  return { adapter, prompts };
}

describe('createReauthenticator', () => {
  it('resolves false immediately with NoopAuthAdapter, never calling attempt', async () => {
    const reauth = createReauthenticator(new NoopAuthAdapter());
    const attempt = vi.fn(async () => true);

    const result = await reauth.reauthenticate(attempt);

    expect(result).toBe(false);
    expect(attempt).not.toHaveBeenCalled();
  });

  it('resolves true when the first prompt succeeds', async () => {
    const { adapter, prompts } = createFakeAdapter();
    const reauth = createReauthenticator(adapter);
    const attempt = vi.fn(async (username: string, password: string) => username === 'quicken' && password === 'password');

    const pending = reauth.reauthenticate(attempt);
    prompts[0].resolve({ username: 'quicken', password: 'password' });
    const result = await pending;

    expect(result).toBe(true);
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(attempt).toHaveBeenCalledWith('quicken', 'password');
  });

  it('resolves false when the user cancels', async () => {
    const { adapter, prompts } = createFakeAdapter();
    const reauth = createReauthenticator(adapter);

    const pending = reauth.reauthenticate(async () => true);
    prompts[0].resolve(null);
    const result = await pending;

    expect(result).toBe(false);
  });

  it('re-prompts with an error message after a failed attempt, then succeeds', async () => {
    const { adapter, prompts } = createFakeAdapter();
    const reauth = createReauthenticator(adapter);
    const attempt = vi
      .fn<(u: string, p: string) => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const pending = reauth.reauthenticate(attempt);
    prompts[0].resolve({ username: 'quicken', password: 'wrong' });
    await vi.waitFor(() => expect(prompts.length).toBe(2));
    expect(prompts[1].errorMessage).toBeTruthy();
    prompts[1].resolve({ username: 'quicken', password: 'password' });

    const result = await pending;
    expect(result).toBe(true);
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it('dedupes concurrent calls into a single prompt', async () => {
    const { adapter, prompts } = createFakeAdapter();
    const reauth = createReauthenticator(adapter);
    const attempt = vi.fn(async () => true);

    const first = reauth.reauthenticate(attempt);
    const second = reauth.reauthenticate(attempt);

    expect(prompts.length).toBe(1);
    prompts[0].resolve({ username: 'a', password: 'b' });

    expect(await first).toBe(true);
    expect(await second).toBe(true);
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it('resolves true and closes a pending prompt when another tab reports success', async () => {
    const { adapter: adapterA, prompts: promptsA } = createFakeAdapter();
    const { adapter: adapterB, prompts: promptsB } = createFakeAdapter();
    const reauthA = createReauthenticator(adapterA);
    const reauthB = createReauthenticator(adapterB);

    // Tab A opens a prompt and never resolves it directly — its resolution comes from tab B's
    // own, independent login succeeding instead.
    const pendingA = reauthA.reauthenticate(async () => true);
    await vi.waitFor(() => expect(promptsA.length).toBe(1));

    const pendingB = reauthB.reauthenticate(async () => true);
    await vi.waitFor(() => expect(promptsB.length).toBe(1));
    promptsB[0].resolve({ username: 'quicken', password: 'password' });

    expect(await pendingB).toBe(true);
    expect(await pendingA).toBe(true);
    expect(promptsA[0].closed).toBe(true);
  });

  it('ignores a broadcast that is not a well-formed success message from this mechanism', async () => {
    const { adapter, prompts } = createFakeAdapter();
    const reauth = createReauthenticator(adapter);

    const pending = reauth.reauthenticate(async () => true);
    await vi.waitFor(() => expect(prompts.length).toBe(1));

    // Some other same-origin script — an unrelated feature, or one reusing this channel name
    // by accident — posting a bare string or a differently-shaped object must not satisfy this
    // prompt. (It cannot defend against a script that deliberately reproduces the exact message
    // shape — see the trust-boundary note in reauth.ts — but it must not be satisfied by chance.)
    const foreignChannel = new BroadcastChannel('trailhead-reauth');
    foreignChannel.postMessage('success');
    foreignChannel.postMessage({ type: 'success' }); // missing `channel`
    foreignChannel.postMessage({ channel: 'trailhead-reauth', type: 'other' }); // wrong `type`
    foreignChannel.close();

    // Give any (incorrect) resolution a chance to land before proving it didn't.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(prompts[0].closed).toBe(false);

    // The real shape still works.
    prompts[0].resolve({ username: 'quicken', password: 'password' });
    expect(await pending).toBe(true);
  });
});
