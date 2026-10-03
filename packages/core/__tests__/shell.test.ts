// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Trailhead } from '../src/shell.js';
import { NoopAuthAdapter } from '../src/adapters/types.js';
import type {
  AuthAdapter,
  Credentials,
  CredentialPromptHandle,
  DesignSystemAdapter,
  DialogConfig,
  DialogResult,
  FeedbackAdapter,
} from '../src/adapters/types.js';

/** A fake adapter whose showDialog() is fully controllable by the test. */
function createFakeAdapter() {
  let resolveDialog!: (result: DialogResult<any>) => void;
  let lastDialogConfig: DialogConfig<any> | undefined;

  const feedback: FeedbackAdapter = {
    showBusy: vi.fn(),
    clearBusy: vi.fn(),
    showToast: vi.fn(),
    showDialog: vi.fn((config: DialogConfig<any>) => {
      lastDialogConfig = config;
      return new Promise<DialogResult<any>>((resolve) => {
        resolveDialog = resolve;
      });
    }),
  };

  const adapter: DesignSystemAdapter = {
    name: 'fake',
    version: '1.0.0',
    init: vi.fn(async () => {}),
    feedback,
    auth: new NoopAuthAdapter(),
  };

  return {
    adapter,
    feedback,
    getLastDialogConfig: () => lastDialogConfig,
    resolveDialog: (result: DialogResult<any>) => resolveDialog(result),
  };
}

/** Creates a Trailhead shell with an empty shell.json and returns the `window.shell` API it exposes. */
async function createShell(adapter: DesignSystemAdapter) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ json: async () => ({ apps: [], nav: [] }) })
  );
  await Trailhead.create({ adapter });
  return window.shell;
}

// Some tests replace window.location with a stub; put the real one back between tests.
const realLocation = window.location;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (window as any).shell;
  delete (window as any).AppMount;
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  window.history.replaceState(null, '', '/');
});

describe('Trailhead shell API — confirmation dialogs', () => {
  it('confirm() shows a Cancel/Confirm dialog and resolves true only for "confirm"', async () => {
    const { adapter, getLastDialogConfig, resolveDialog } = createFakeAdapter();
    const shell = await createShell(adapter);

    const promise = shell.feedback.confirm('Proceed?', 'Confirm Action');

    expect(getLastDialogConfig()).toMatchObject({
      message: 'Proceed?',
      title: 'Confirm Action',
      buttons: [
        { label: 'Cancel', value: 'cancel', variant: 'secondary' },
        { label: 'Confirm', value: 'confirm', variant: 'primary' },
      ],
    });

    resolveDialog({ value: 'confirm' });
    expect(await promise).toBe(true);
  });

  it('confirm() resolves false for any other outcome, including a dismiss', async () => {
    const { adapter, resolveDialog } = createFakeAdapter();
    const shell = await createShell(adapter);

    const promise = shell.feedback.confirm('Proceed?');
    resolveDialog({ value: null });

    expect(await promise).toBe(false);
  });

  it('ok() shows a single OK button and always resolves undefined', async () => {
    const { adapter, getLastDialogConfig, resolveDialog } = createFakeAdapter();
    const shell = await createShell(adapter);

    const promise = shell.feedback.ok('Saved.');
    expect(getLastDialogConfig()!.buttons).toEqual([{ label: 'OK', value: 'ok', variant: 'primary' }]);

    resolveDialog({ value: 'ok' });
    expect(await promise).toBeUndefined();
  });

  it('yesNo() resolves true only for "yes"', async () => {
    const { adapter, resolveDialog } = createFakeAdapter();
    const shell = await createShell(adapter);

    const promise = shell.feedback.yesNo('Agree to terms?');
    resolveDialog({ value: 'no' });

    expect(await promise).toBe(false);
  });

  it('yesNoCancel() falls back to "cancel" when dismissed without a button', async () => {
    const { adapter, resolveDialog } = createFakeAdapter();
    const shell = await createShell(adapter);

    const promise = shell.feedback.yesNoCancel('Save changes before closing?');
    resolveDialog({ value: null });

    expect(await promise).toBe('cancel');
  });

  it('custom() passes the caller\'s buttons straight through and resolves with the picked value', async () => {
    const { adapter, getLastDialogConfig, resolveDialog } = createFakeAdapter();
    const shell = await createShell(adapter);

    const buttons = [
      { label: 'Option A', value: 'a' as const },
      { label: 'Option B', value: 'b' as const },
    ];
    const promise = shell.feedback.custom('Pick one', 'Choose', buttons);
    expect(getLastDialogConfig()!.buttons).toBe(buttons);

    resolveDialog({ value: 'b' });
    expect(await promise).toBe('b');
  });
});

describe('Trailhead shell API — toasts', () => {
  it('error() defaults duration to 5000ms and warning() to 4000ms; others pass duration through as given', async () => {
    const { adapter, feedback } = createFakeAdapter();
    const shell = await createShell(adapter);

    shell.feedback.error('Oops');
    expect(feedback.showToast).toHaveBeenLastCalledWith('Oops', 'error', 5000);

    shell.feedback.warning('Careful');
    expect(feedback.showToast).toHaveBeenLastCalledWith('Careful', 'warning', 4000);

    shell.feedback.success('Done');
    expect(feedback.showToast).toHaveBeenLastCalledWith('Done', 'success', undefined);

    shell.feedback.success('Done fast', 1000);
    expect(feedback.showToast).toHaveBeenLastCalledWith('Done fast', 'success', 1000);
  });

  it('busy() and clear() delegate straight to the adapter', async () => {
    const { adapter, feedback } = createFakeAdapter();
    const shell = await createShell(adapter);

    shell.feedback.busy('Loading…');
    expect(feedback.showBusy).toHaveBeenCalledWith('Loading…');

    shell.feedback.clear();
    expect(feedback.clearBusy).toHaveBeenCalled();
  });
});

describe('Trailhead shell API — auth', () => {
  it('auth.reauthenticate() is backed by the reauthenticator built from adapter.auth', async () => {
    const promptCredentials = vi.fn(
      (): CredentialPromptHandle => ({
        result: Promise.resolve<Credentials | null>({ username: 'alice', password: 'secret' }),
        close: () => {},
      })
    );
    const authAdapter: AuthAdapter = { promptCredentials };

    const { adapter } = createFakeAdapter();
    (adapter as any).auth = authAdapter;
    const shell = await createShell(adapter);

    const attempt = vi.fn(async (username: string, password: string) => {
      expect(username).toBe('alice');
      expect(password).toBe('secret');
      return true;
    });

    expect(await shell.auth.reauthenticate(attempt)).toBe(true);
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it('a NoopAuthAdapter (the default for adapters with no login UI yet) always declines', async () => {
    const { adapter } = createFakeAdapter(); // uses NoopAuthAdapter by default
    const shell = await createShell(adapter);

    const attempt = vi.fn(async () => true);
    expect(await shell.auth.reauthenticate(attempt)).toBe(false);
    expect(attempt).not.toHaveBeenCalled();
  });
});

describe('Trailhead shell API — navigation under a non-root appBasePath', () => {
  /** Renders the shell against a `#shell-navigation` element with a single nav link. */
  async function createShellWithNav(appBasePath: string) {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({
          apps: [{ id: 'demo', basePath: '/demo', src: 'demo' }],
          nav: [{ type: 'link', label: 'Demo', order: 1, href: '/demo' }],
        }),
      })
    );
    document.body.innerHTML = '<nav id="shell-navigation"></nav><div id="shell-content"></div>';
    const { adapter } = createFakeAdapter();
    const trailhead = await Trailhead.create({ adapter, appBasePath });
    trailhead.start();
    return window.shell;
  }

  it('renders nav link hrefs prefixed with appBasePath rather than the bare shell.json href', async () => {
    await createShellWithNav('/sample/trailhead/webawesome');

    const link = document.querySelector('#shell-navigation a[data-path="/demo"]') as HTMLAnchorElement | null;
    expect(link?.getAttribute('href')).toBe('/sample/trailhead/webawesome/demo');
  });

  it('window.shell.navigation.navigate() prepends appBasePath before the hard redirect', async () => {
    const shell = await createShellWithNav('/sample/trailhead/webawesome');

    const assignedHrefs: string[] = [];
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...window.location,
        set href(value: string) {
          assignedHrefs.push(value);
        },
      },
    });

    shell.navigation.navigate('/demo');
    expect(assignedHrefs).toEqual(['/sample/trailhead/webawesome/demo']);
  });

  it('a link marked external:true is left exactly as written, not prefixed with appBasePath', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({
          apps: [{ id: 'demo', basePath: '/demo', src: 'demo' }],
          nav: [
            { type: 'link', label: 'Demo', order: 1, href: '/demo' },
            // A same-origin absolute path outside this deployment's appBasePath — e.g. a legacy
            // app mounted at a different root. Only `external: true` can express "leave alone";
            // it isn't a full URL, so the http(s)://|// regex alone wouldn't catch it.
            { type: 'link', label: 'Legacy App', order: 2, href: '/legacy/dashboard/', external: true },
          ],
        }),
      })
    );
    document.body.innerHTML = '<nav id="shell-navigation"></nav><div id="shell-content"></div>';
    const { adapter } = createFakeAdapter();
    const trailhead = await Trailhead.create({ adapter, appBasePath: '/sample/trailhead/webawesome' });
    trailhead.start();

    const link = document.querySelector('#shell-navigation a[data-path="/legacy/dashboard/"]') as HTMLAnchorElement | null;
    expect(link?.getAttribute('href')).toBe('/legacy/dashboard/');
    expect(link?.getAttribute('data-external')).toBe('true');
  });
});

describe('Trailhead shell — routing', () => {
  const apps = [
    { id: 'demo', basePath: '/demo', src: 'demo' },
    { id: 'other', basePath: '/other', src: 'other' },
  ];
  const nav = [
    { type: 'link', label: 'Demo', order: 1, href: '/demo' },
    { type: 'link', label: 'Other', order: 2, href: '/other' },
    { type: 'link', label: 'Docs', order: 3, href: 'https://example.com/docs' },
  ];

  /** Creates and starts a shell at `path` under appBasePath `/base`. */
  async function startShell(path: string, content = '') {
    window.history.replaceState(null, '', path);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ apps, nav }) }));
    document.body.innerHTML = `<nav id="shell-navigation"></nav><div id="shell-content">${content}</div>`;
    const { adapter } = createFakeAdapter();
    const trailhead = await Trailhead.create({ adapter, appBasePath: '/base' });
    trailhead.start();
    return trailhead;
  }

  const appScript = () => document.querySelector<HTMLScriptElement>('script[src="/base/demo/app.js"]');
  const content = () => document.getElementById('shell-content')!;

  it("loads the matching app's module script and stylesheet for the initial route", async () => {
    await startShell('/base/demo/orders');

    expect(appScript()?.type).toBe('module');
    expect(document.querySelector('link[rel="stylesheet"][href="/base/demo/demo.css"]')).not.toBeNull();
    expect(content().textContent).toContain('Loading...');
  });

  it("mounts the app into #shell-content with its full base path once the script loads", async () => {
    const appMount = vi.fn();
    (window as any).AppMount = appMount;
    await startShell('/base/demo');

    appScript()!.dispatchEvent(new Event('load'));

    expect(appMount).toHaveBeenCalledWith(content(), '/base/demo');
    expect(content().textContent).not.toContain('Loading...');
  });

  it('shows an error in #shell-content when the app script fails to load', async () => {
    await startShell('/base/demo');

    appScript()!.dispatchEvent(new Event('error'));

    expect(content().textContent).toContain('Failed to load application: demo');
  });

  it('does not load the app again when it is already mounted', async () => {
    await startShell('/base/demo', '<div id="root"><p>mounted</p></div>');

    expect(appScript()).toBeNull();
  });

  it("marks only the current app's nav link active", async () => {
    await startShell('/base/demo');

    const link = (path: string) => document.querySelector(`#shell-navigation a[data-path="${path}"]`)!;
    expect(link('/demo').classList.contains('shell-nav-item-active')).toBe(true);
    expect(link('/other').classList.contains('shell-nav-item-active')).toBe(false);
  });

  it.each([
    { case: "the nav href has a trailing slash and the app's basePath doesn't", href: '/demo/', basePath: '/demo' },
    { case: "the app's basePath has a trailing slash and the nav href doesn't", href: '/demo', basePath: '/demo/' },
  ])('marks the nav link active when $case', async ({ href, basePath }) => {
    window.history.replaceState(null, '', '/demo/');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({
        apps: [{ id: 'demo', basePath, src: 'demo' }],
        nav: [{ type: 'link', label: 'Demo', order: 1, href }],
      }),
    }));
    document.body.innerHTML = '<nav id="shell-navigation"></nav><div id="shell-content"></div>';
    const { adapter } = createFakeAdapter();

    const trailhead = await Trailhead.create({ adapter });
    trailhead.start();

    expect(document.querySelector('#shell-navigation a')!.classList.contains('shell-nav-item-active')).toBe(true);
  });

  it('clicking an internal nav link navigates through appBasePath instead of following the href', async () => {
    await startShell('/base/demo');
    const assignedHrefs: string[] = [];
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...realLocation, set href(value: string) { assignedHrefs.push(value); } },
    });

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.querySelector('#shell-navigation a[data-path="/other"]')!.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(assignedHrefs).toEqual(['/base/other']);
  });

  it('clicking an external nav link is left to the browser', async () => {
    await startShell('/base/demo');

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.querySelector('#shell-navigation a[data-path="https://example.com/docs"]')!.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(false);
  });
});

describe('Trailhead shell — start-up', () => {
  const apps = [{ id: 'demo', basePath: '/demo', src: 'demo' }];
  const nav = [{ type: 'link', label: 'Demo', order: 1, href: '/demo' }];

  function givenPage(path = '/demo') {
    window.history.replaceState(null, '', path);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ apps, nav }) }));
    document.body.innerHTML = '<nav id="shell-navigation"></nav><div id="shell-content"></div>';
  }

  const appScripts = () => document.querySelectorAll('script[src="/demo/app.js"]');

  it('create() resolves with shell.json loaded and window.shell exposed, without touching the page', async () => {
    givenPage();
    const { adapter } = createFakeAdapter();

    const trailhead = await Trailhead.create({ adapter });

    expect(adapter.init).toHaveBeenCalledTimes(1);
    expect(window.shell).toBeDefined();
    expect(trailhead.getNavigation()).toEqual(nav);
    expect(trailhead.getApps()).toEqual(apps);
    expect(document.getElementById('shell-navigation')!.children).toHaveLength(0);
    expect(appScripts()).toHaveLength(0);
  });

  it('start() renders navigation and loads the app for the current route', async () => {
    givenPage();
    const { adapter } = createFakeAdapter();
    const trailhead = await Trailhead.create({ adapter });

    trailhead.start();

    expect(document.querySelector('#shell-navigation a[data-path="/demo"]')).not.toBeNull();
    expect(appScripts()).toHaveLength(1);
  });

  it('start() only takes effect once, so a second call adds no duplicate nav handlers or route listeners', async () => {
    givenPage();
    const { adapter } = createFakeAdapter();
    const trailhead = await Trailhead.create({ adapter });
    // Count registrations rather than dispatching popstate: shells from earlier tests are
    // still listening on the shared window and would respond too.
    const addListener = vi.spyOn(window, 'addEventListener');

    trailhead.start();
    trailhead.start();

    expect(appScripts()).toHaveLength(1);
    expect(addListener.mock.calls.filter(([type]) => type === 'popstate')).toHaveLength(1);
  });

  it('create() still resolves, with empty navigation, when shell.json cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { adapter } = createFakeAdapter();

    const trailhead = await Trailhead.create({ adapter });

    expect(trailhead.getNavigation()).toEqual([]);
    expect(trailhead.getApps()).toEqual([]);
  });

  it('create() rejects, and shows the failure instead of a blank page, when the adapter fails to initialise', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    givenPage();
    const { adapter } = createFakeAdapter();
    adapter.init = vi.fn(async () => {
      throw new Error('theme failed to load');
    });

    await expect(Trailhead.create({ adapter })).rejects.toThrow('theme failed to load');
    expect(document.getElementById('shell-content')!.textContent).toContain('Failed to start the application shell');
  });
});

describe('Trailhead shell API — auth.recoverSession strategy wiring', () => {
  it('credentials strategy (default): recoverSession resolves false and makes no refresh request', async () => {
    const refresh = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (typeof url === 'string' && url.includes('/_auth/refresh')) refresh();
      return { json: async () => ({ apps: [], nav: [] }), ok: true } as any;
    }));
    const { adapter } = createFakeAdapter();
    await Trailhead.create({ adapter }); // no `auth` → credentials

    const result = await window.shell.auth.recoverSession();

    expect(result).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('cognito strategy: recoverSession POSTs the refresh endpoint and resolves true on 2xx', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (typeof url === 'string' && url.includes('/_auth/refresh')) return { ok: true } as Response;
      return { json: async () => ({ apps: [], nav: [] }), ok: true } as any;
    });
    vi.stubGlobal('fetch', fetchMock);
    const { adapter } = createFakeAdapter();
    await Trailhead.create({ adapter, auth: { strategy: 'cognito' } });

    const result = await window.shell.auth.recoverSession();

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('/_auth/refresh', { method: 'POST' });
  });
});
