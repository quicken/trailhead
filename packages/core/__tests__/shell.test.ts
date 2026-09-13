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

/** Constructs a Trailhead shell and waits for its async init chain to expose window.shell. */
async function createShell(adapter: DesignSystemAdapter) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ json: async () => ({ apps: [], nav: [] }) })
  );
  new Trailhead({ adapter });
  // window.shell is assigned partway through the constructor's async init chain, right
  // after `await adapter.init()` resolves — a couple of microtask flushes is enough since
  // our fake adapter's init() resolves immediately.
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  return window.shell;
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as any).shell;
  document.body.innerHTML = '';
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
    new Trailhead({ adapter, appBasePath });
    // Extra ticks beyond createShell()'s: loadNavigation() awaits both the fetch and its
    // .json() call before renderNavigation() runs, each adding its own microtask hop.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
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
});
