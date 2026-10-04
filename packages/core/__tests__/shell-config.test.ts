// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Trailhead, type ShellConfig } from '../src/shell.js';
import { NoopAuthAdapter } from '../src/adapters/types.js';
import type { DesignSystemAdapter } from '../src/adapters/types.js';

/**
 * How `Trailhead.create()` turns its config into runtime behaviour: where `shell.json` is fetched
 * from, the base `shell.http` puts in front of relative paths, and which session-recovery strategy
 * a `401` gets. Driven end to end through `window.shell.http` with a stubbed global `fetch` (ky
 * reads `globalThis.fetch` per request), so these hold regardless of how `create()` is structured.
 */

type Route = (url: string, method: string) => Response | undefined;

/**
 * jsdom leaves Node's `Request` in place, which rejects relative URLs; a browser resolves them
 * against the document. ky builds a `Request` from `/api/orders`, so mirror the browser here.
 */
class BrowserRequest extends Request {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(typeof input === 'string' ? new URL(input, document.baseURI) : input, init);
  }
}

/** Stubs global fetch; `shell.json` gets `manifest`, everything else goes to `route` or 404s. */
function stubFetch(route: Route = () => undefined, manifest: unknown = { apps: [], nav: [] }) {
  const calls: Array<{ url: string; method: string }> = [];
  vi.stubGlobal('Request', BrowserRequest);
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    calls.push({ url, method });
    if (url.endsWith('/shell.json')) return Response.json(manifest);
    return route(url, method) ?? new Response('{}', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

/** Request paths (origin stripped) — ky hands fetch absolute Request URLs. */
const paths = (calls: Array<{ url: string }>) => calls.map((c) => new URL(c.url, document.baseURI).pathname);

function createAdapter(): DesignSystemAdapter {
  return {
    name: 'fake',
    version: '1.0.0',
    init: vi.fn(async () => {}),
    feedback: { showBusy: vi.fn(), clearBusy: vi.fn(), showToast: vi.fn(), showDialog: vi.fn() },
    auth: new NoopAuthAdapter(),
  };
}

async function create(config: Partial<ShellConfig> = {}) {
  const adapter = createAdapter();
  const trailhead = await Trailhead.create({ adapter, ...config });
  return { adapter, trailhead };
}

/** Replaces window.location with a stub that records assign() instead of navigating. */
function captureRedirects() {
  const assigned: string[] = [];
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...realLocation, href: realLocation.href, origin: realLocation.origin, pathname: '/orders', search: '?page=2', assign: (url: string) => assigned.push(url) },
  });
  return assigned;
}

const realLocation = window.location;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (window as any).shell;
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
});

describe('Trailhead.create() — where shell.json comes from', () => {
  it('fetches shell.json from appBasePath when no shellUrl is given', async () => {
    const { calls } = stubFetch();
    await create({ appBasePath: '/app' });

    expect(calls[0].url).toBe('/app/shell.json');
  });

  it('fetches shell.json from shellUrl, and initialises the adapter with it, when given', async () => {
    const { calls } = stubFetch();
    const { adapter } = await create({ appBasePath: '/app', shellUrl: '/static/shell' });

    expect(calls[0].url).toBe('/static/shell/shell.json');
    expect(adapter.init).toHaveBeenCalledWith('/static/shell');
  });

  it('initialises the adapter before fetching shell.json', async () => {
    const order: string[] = [];
    stubFetch();
    const adapter = createAdapter();
    adapter.init = vi.fn(async () => {
      order.push('adapter.init');
    });
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (...args: Parameters<typeof fetch>) => {
      order.push('fetch');
      return original(...args);
    });

    await Trailhead.create({ adapter });

    expect(order).toEqual(['adapter.init', 'fetch']);
  });

  it('does not fetch shell.json when the adapter fails to initialise', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { calls } = stubFetch();
    const adapter = createAdapter();
    adapter.init = vi.fn(async () => {
      throw new Error('boom');
    });

    await expect(Trailhead.create({ adapter })).rejects.toThrow('boom');
    expect(calls).toEqual([]);
  });
});

describe('Trailhead.create() — apiUrl', () => {
  it('shell.http prefixes relative paths with the configured apiUrl', async () => {
    const { calls } = stubFetch((url) => (url.endsWith('/api/orders') ? Response.json([]) : undefined));
    await create({ apiUrl: '/api' });

    const result = await window.shell.http.get('/orders', { noFeedback: true });

    expect(result.success).toBe(true);
    expect(paths(calls).at(-1)).toBe('/api/orders');
  });

  it('shell.http uses a relative path as-is when no apiUrl is configured', async () => {
    const { calls } = stubFetch((url) => (url.endsWith('/orders') ? Response.json([]) : undefined));
    await create();

    await window.shell.http.get('/orders', { noFeedback: true });

    expect(paths(calls).at(-1)).toBe('/orders');
  });
});

describe('Trailhead.create() — auth strategy', () => {
  const unauthorised = () => new Response('{}', { status: 401 });

  it('credentials (the default): a 401 is surfaced to the caller with no refresh attempt', async () => {
    const { calls } = stubFetch((url) => (url.endsWith('/orders') ? unauthorised() : undefined));
    await create();

    const result = await window.shell.http.get('/orders', { noFeedback: true });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.status).toBe(401);
    expect(paths(calls)).not.toContain('/_auth/refresh');
  });

  it('cognito: a 401 refreshes at /_auth/refresh and retries the request once', async () => {
    let ordersCalls = 0;
    const { calls } = stubFetch((url, method) => {
      if (url.endsWith('/orders')) return ++ordersCalls === 1 ? unauthorised() : Response.json(['o1']);
      if (url === '/_auth/refresh' && method === 'POST') return new Response(null, { status: 204 });
    });
    await create({ auth: { strategy: 'cognito' } });

    const result = await window.shell.http.get<string[]>('/orders', { noFeedback: true });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(['o1']);
    expect(paths(calls)).toEqual(['/shell.json', '/orders', '/_auth/refresh', '/orders']);
  });

  it('cognito: honours custom refreshPath and signinPath, redirecting with the current path as return', async () => {
    const { calls } = stubFetch((url) => (url.endsWith('/orders') ? unauthorised() : new Response(null, { status: 401 })));
    await create({ auth: { strategy: 'cognito', refreshPath: '/auth/renew', signinPath: '/auth/login' } });
    const redirects = captureRedirects();

    await window.shell.auth.recoverSession();

    expect(calls.map((c) => c.url)).toContain('/auth/renew');
    expect(redirects).toEqual([`/auth/login?return=${encodeURIComponent('/orders?page=2')}`]);
  });

  it('credentials: shell.auth.recoverSession() resolves false without any request', async () => {
    const { calls } = stubFetch();
    await create({ auth: { strategy: 'credentials' } });

    expect(await window.shell.auth.recoverSession()).toBe(false);
    expect(paths(calls)).toEqual(['/shell.json']);
  });
});

describe('Trailhead.create() — deployment config from shell.json', () => {
  const unauthorised = () => new Response('{}', { status: 401 });
  const manifest = (extra: object) => ({ apps: [], nav: [], ...extra });

  it('uses shell.json apiUrl when create() is given none', async () => {
    const { calls } = stubFetch(() => Response.json([]), manifest({ apiUrl: '/api' }));
    await create();

    await window.shell.http.get('/orders', { noFeedback: true });

    expect(paths(calls).at(-1)).toBe('/api/orders');
  });

  it('an apiUrl passed to create() wins over shell.json', async () => {
    const { calls } = stubFetch(() => Response.json([]), manifest({ apiUrl: '/from-manifest' }));
    await create({ apiUrl: '/from-config' });

    await window.shell.http.get('/orders', { noFeedback: true });

    expect(paths(calls).at(-1)).toBe('/from-config/orders');
  });

  it('uses shell.json auth when create() is given none', async () => {
    let ordersCalls = 0;
    const { calls } = stubFetch(
      (url) => {
        if (url.endsWith('/orders')) return ++ordersCalls === 1 ? unauthorised() : Response.json([]);
        if (url === '/_auth/refresh') return new Response(null, { status: 204 });
      },
      manifest({ auth: { strategy: 'cognito' } })
    );
    await create();

    const result = await window.shell.http.get('/orders', { noFeedback: true });

    expect(result.success).toBe(true);
    expect(paths(calls)).toContain('/_auth/refresh');
  });

  it('honours custom refreshPath and signinPath from shell.json', async () => {
    const { calls } = stubFetch(() => new Response(null, { status: 401 }), manifest({ auth: { strategy: 'cognito', refreshPath: '/auth/renew', signinPath: '/auth/login' } }));
    await create();
    const redirects = captureRedirects();

    await window.shell.auth.recoverSession();

    expect(calls.map((c) => c.url)).toContain('/auth/renew');
    expect(redirects).toEqual([`/auth/login?return=${encodeURIComponent('/orders?page=2')}`]);
  });

  it('an auth strategy passed to create() wins over shell.json', async () => {
    const { calls } = stubFetch((url) => (url.endsWith('/orders') ? unauthorised() : undefined), manifest({ auth: { strategy: 'cognito' } }));
    await create({ auth: { strategy: 'credentials' } });

    const result = await window.shell.http.get('/orders', { noFeedback: true });

    expect(result.success).toBe(false);
    expect(paths(calls)).not.toContain('/_auth/refresh');
  });

  it('falls back to the create() config when shell.json cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('Request', BrowserRequest);
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.endsWith('/shell.json')) throw new Error('offline');
      return Response.json([]);
    });
    vi.stubGlobal('fetch', fetchMock);
    await create({ apiUrl: '/api' });

    await window.shell.http.get('/orders', { noFeedback: true });

    const last = fetchMock.mock.calls.at(-1)![0] as Request;
    expect(new URL(last.url).pathname).toBe('/api/orders');
  });

  describe('rejects unsafe values (warns, ignores the field, keeps the rest of shell.json)', () => {
    it.each(['https://evil.example', '//evil.example', '/\\evil.example', 'api', 'javascript:alert(1)', 42])(
      'apiUrl %j',
      async (apiUrl) => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { calls } = stubFetch(() => Response.json([]), manifest({ apiUrl, apps: [{ id: 'demo', basePath: '/demo', src: 'demo' }] }));
        const { trailhead } = await create();

        await window.shell.http.get('/orders', { noFeedback: true });

        expect(paths(calls).at(-1)).toBe('/orders');
        expect(trailhead.getApps()).toHaveLength(1);
        expect(console.warn).toHaveBeenCalled();
      }
    );

    it.each([
      { case: 'an unknown strategy', auth: { strategy: 'oauth' } },
      { case: 'a non-object', auth: 'cognito' },
      { case: 'an off-origin refreshPath', auth: { strategy: 'cognito', refreshPath: 'https://evil.example/refresh' } },
      { case: 'a protocol-relative signinPath', auth: { strategy: 'cognito', signinPath: '//evil.example/login' } },
      { case: 'a script signinPath', auth: { strategy: 'cognito', signinPath: 'javascript:alert(1)' } },
    ])('auth with $case falls back to credentials', async ({ auth }) => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { calls } = stubFetch((url) => (url.endsWith('/orders') ? unauthorised() : undefined), manifest({ auth }));
      await create();

      const result = await window.shell.http.get('/orders', { noFeedback: true });

      expect(result.success).toBe(false);
      expect(paths(calls)).toEqual(['/shell.json', '/orders']);
      expect(console.warn).toHaveBeenCalled();
    });
  });
});

describe('Trailhead.create() — allowedOrigins (M-3)', () => {
  const manifest = (extra: object) => ({ apps: [], nav: [], ...extra });
  /** Full URLs requested after shell.json. */
  const requested = (calls: Array<{ url: string }>) => calls.map((c) => c.url).filter((u) => !u.endsWith('/shell.json'));

  it('enforces allowedOrigins from shell.json through window.shell.http', async () => {
    const { calls } = stubFetch(() => Response.json([]), manifest({ allowedOrigins: ['https://api.example.com'] }));
    await create();

    const listed = await window.shell.http.get('https://api.example.com/users', { noFeedback: true });
    const unlisted = await window.shell.http.get('https://evil.example/collect', { noFeedback: true });

    expect(listed.success).toBe(true);
    expect(unlisted.success).toBe(false);
    if (!unlisted.success) expect(unlisted.error.name).toBe('OriginNotAllowedError');
    expect(requested(calls)).toEqual(['https://api.example.com/users']);
  });

  it('allowedOrigins passed to create() wins over shell.json', async () => {
    const { calls } = stubFetch(() => Response.json([]), manifest({ allowedOrigins: ['https://from-manifest.example'] }));
    await create({ allowedOrigins: ['https://from-config.example'] });

    await window.shell.http.get('https://from-manifest.example/x', { noFeedback: true });
    await window.shell.http.get('https://from-config.example/x', { noFeedback: true });

    expect(requested(calls)).toEqual(['https://from-config.example/x']);
  });

  it('accepts an absolute shell.json apiUrl whose origin is in allowedOrigins', async () => {
    const { calls } = stubFetch(() => Response.json([]), manifest({ apiUrl: 'https://api.example.com/v1', allowedOrigins: ['https://api.example.com'] }));
    await create();

    await window.shell.http.get('/orders', { noFeedback: true });

    expect(requested(calls)).toEqual(['https://api.example.com/v1/orders']);
  });

  it('still ignores an absolute shell.json apiUrl whose origin is not listed', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { calls } = stubFetch(() => Response.json([]), manifest({ apiUrl: 'https://evil.example', allowedOrigins: ['https://api.example.com'] }));
    await create();

    await window.shell.http.get('/orders', { noFeedback: true });

    expect(paths(calls).at(-1)).toBe('/orders');
    expect(console.warn).toHaveBeenCalled();
  });

  it.each([
    ['a path', 'https://api.example.com/v1'],
    ['a script URL', 'javascript:alert(1)'],
    ['a non-http scheme', 'ftp://files.example.com'],
    ['a protocol-relative URL', '//api.example.com'],
    ['a bare host', 'api.example.com'],
    ['a non-string', 42],
  ])('drops an allowedOrigins entry that is %s, with a warning, keeping the rest', async (_case, bad) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { calls } = stubFetch(() => Response.json([]), manifest({ allowedOrigins: [bad, 'https://good.example'] }));
    await create();

    await window.shell.http.get('https://good.example/x', { noFeedback: true });

    expect(requested(calls)).toEqual(['https://good.example/x']);
    expect(console.warn).toHaveBeenCalled();
  });

  it('ignores a non-array allowedOrigins with a warning (compatibility mode applies)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { calls } = stubFetch(() => Response.json([]), manifest({ allowedOrigins: 'https://api.example.com' }));
    await create();

    const result = await window.shell.http.get('https://third-party.example/x', { noFeedback: true });

    expect(result.success).toBe(true);
    expect(requested(calls)).toEqual(['https://third-party.example/x']);
    expect(console.warn).toHaveBeenCalled();
  });
});
