import { describe, it, expect, vi } from 'vitest';
import { createRedirectSessionRecovery } from '../src/lib/session-recovery.js';

/** Builds a recoverer with controllable fetch/redirect/currentPath seams. */
function setup(options: {
  fetchImpl: typeof fetch;
  refreshPath?: string;
  signinPath?: string;
  currentPath?: string;
}) {
  const redirect = vi.fn<(url: string) => void>();
  const recoverer = createRedirectSessionRecovery({
    refreshPath: options.refreshPath,
    signinPath: options.signinPath,
    env: {
      fetch: options.fetchImpl,
      redirect,
      currentPath: () => options.currentPath ?? '/orders',
    },
  });
  return { recoverer, redirect };
}

/** Minimal Response-like stub — only `.ok` is read by the recoverer. */
function response(ok: boolean): Response {
  return { ok } as Response;
}

describe('createRedirectSessionRecovery', () => {
  it('resolves true and does not redirect when refresh returns 2xx', async () => {
    const fetchImpl = vi.fn(async () => response(true));
    const { recoverer, redirect } = setup({ fetchImpl });

    const result = await recoverer.recoverSession();

    expect(result).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith('/_auth/refresh', { method: 'POST' });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirects to signin with the encoded current path when refresh returns 401', async () => {
    const fetchImpl = vi.fn(async () => response(false));
    const { recoverer, redirect } = setup({ fetchImpl, currentPath: '/orders?page=2&q=a b' });

    const result = await recoverer.recoverSession();

    expect(result).toBe(false);
    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith(
      `/_auth/signin?return=${encodeURIComponent('/orders?page=2&q=a b')}`
    );
  });

  it('redirects to signin when the refresh request throws (network error)', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down');
    });
    const { recoverer, redirect } = setup({ fetchImpl, currentPath: '/dashboard' });

    const result = await recoverer.recoverSession();

    expect(result).toBe(false);
    expect(redirect).toHaveBeenCalledWith(`/_auth/signin?return=${encodeURIComponent('/dashboard')}`);
  });

  it('honours custom refresh and signin endpoints', async () => {
    const fetchImpl = vi.fn(async () => response(false));
    const { recoverer, redirect } = setup({
      fetchImpl,
      refreshPath: '/edge/refresh',
      signinPath: '/edge/login',
      currentPath: '/x',
    });

    await recoverer.recoverSession();

    expect(fetchImpl).toHaveBeenCalledWith('/edge/refresh', { method: 'POST' });
    expect(redirect).toHaveBeenCalledWith(`/edge/login?return=${encodeURIComponent('/x')}`);
  });

  it('defaults to the gateway paths when none are supplied', async () => {
    const fetchImpl = vi.fn(async () => response(false));
    const { recoverer, redirect } = setup({ fetchImpl, currentPath: '/' });

    await recoverer.recoverSession();

    expect(fetchImpl).toHaveBeenCalledWith('/_auth/refresh', { method: 'POST' });
    expect(redirect).toHaveBeenCalledWith(`/_auth/signin?return=${encodeURIComponent('/')}`);
  });
});
