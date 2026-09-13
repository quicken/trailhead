# Trailhead Architecture

## Overview

Trailhead is built on a simple adapter pattern that separates core orchestration logic from design system implementation.

```
┌─────────────────────────────────────────────────────────┐
│                    Plugin Apps                          │
│  (React, Vue, Svelte, Vanilla JS)                      │
└────────────────┬────────────────────────────────────────┘
                 │ Uses window.shell API
                 ▼
┌─────────────────────────────────────────────────────────┐
│                  Shell Core                             │
│  - HTTP Client                                          │
│  - Navigation & Routing                                 │
│  - App Loading                                          │
│  - API Exposure                                         │
└────────────────┬────────────────────────────────────────┘
                 │ Uses adapter interface
                 ▼
┌─────────────────────────────────────────────────────────┐
│            Design System Adapter                        │
│  - Web Awesome / CloudScape / Material UI / etc.       │
│  - Toasts, Dialogs, Busy States, Re-auth Prompts       │
│  - Component Loading                                    │
└─────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Shell Core (`packages/core/src/shell.ts`)

The shell is the orchestration layer that:
- Loads and manages plugin applications
- Provides HTTP client with automatic error handling
- Manages navigation and routing
- Exposes the `window.shell` API to apps
- Delegates UI feedback to the design system adapter

**Key Responsibilities:**
- ✅ Framework-agnostic orchestration
- ✅ App lifecycle management (loading only, no unmounting)
- ✅ Navigation configuration from JSON
- ✅ Hard redirects for true isolation

### 2. Design System Adapter (`packages/core/src/adapters/`)

Adapters implement the `DesignSystemAdapter` interface:

```typescript
interface DesignSystemAdapter {
  name: string;
  version: string;
  init(shellUrl: string): Promise<void>;
  feedback: FeedbackAdapter;
  auth: AuthAdapter;
}
```

**Current Adapters:**
- ✅ **Web Awesome** — `@herdingbits/trailhead-webawesome` (vanilla TypeScript)
- ✅ **CloudScape** — `@herdingbits/trailhead-cloudscape` (React)

**Adapter Responsibilities:**
- Load design system assets
- Implement toast notifications
- Implement modal dialogs
- Implement busy/loading overlays
- Implement the re-authentication prompt (or opt out with `NoopAuthAdapter`)
- Provide consistent UI across all apps

### 3. Types Package (`packages/types/`)

TypeScript type definitions for:
- Shell API (`ShellAPI`, `FeedbackAPI`, `HttpAPI`, `NavigationAPI`)
- Adapter interfaces (`DesignSystemAdapter`, `FeedbackAdapter`)

Apps install this as a dev dependency for type safety.

### 4. Plugin Apps

Independent applications that:
- Use any framework (React, Vue, Svelte, vanilla)
- Assign `window.AppMount(container, basePath)` for shell to call
- Use `window.shell` API for services
- Deploy independently

### 5. Re-authentication (`packages/core/src/lib/reauth.ts`)

Sessions expire, and an app shouldn't have to reinvent "what do we do when they do." The shell exposes one shared answer: `window.shell.auth.reauthenticate(attempt)`.

- `createReauthenticator()` wraps the adapter's `AuthAdapter` in a small state machine: show a prompt, wait for credentials, call the app's `attempt` function, and loop with an error message if it fails.
- Concurrent calls from the same tab share one in-flight prompt instead of stacking dialogs on top of each other.
- A `BroadcastChannel` tells other open tabs when one of them succeeds, so the rest can dismiss their own prompt instead of asking the user to log in again per tab.
- Because `AuthAdapter` is just another slot on `DesignSystemAdapter`, each design system renders the prompt with its own native components — a real dialog, not something bolted on.

## Data Flow

### App Loading Flow

```
1. User navigates to /customers
2. Shell reads navigation.json
3. Shell finds matching route
4. Shell creates <script> tag for app
5. App loads and assigns window.AppMount
6. Shell calls AppMount(container, basePath)
7. App renders into container
8. App uses window.shell for services
```

### Feedback Flow

```
1. App calls window.shell.feedback.success("Saved!")
2. Shell delegates to adapter.feedback.showToast()
3. Adapter uses design system components
4. Toast appears using design system styling
```

### Navigation Flow

```
1. App calls window.shell.navigation.navigate("/orders")
2. Shell performs hard redirect (window.location.href)
3. Page reloads with new app
4. Previous app is completely destroyed
5. New app initialises fresh
```

### Re-authentication Flow

```
1. An API call comes back 401 (session expired)
2. App calls window.shell.auth.reauthenticate(attempt)
3. Shell asks adapter.auth.promptCredentials() to show the login prompt
4. User submits credentials → shell calls the app's attempt(username, password)
5. attempt() fails → prompt reopens with an error, back to step 4
6. attempt() succeeds → shell resolves true, app retries its original request
   (or another tab already succeeded → this tab's prompt closes automatically)
```

## Design Decisions

### Why Hard Redirects?

- **True Isolation**: Each app gets a clean slate
- **No Memory Leaks**: Browser handles cleanup
- **Simple**: No complex state management
- **Fast Enough**: Modern browsers are fast
- **No Coordination**: Apps can't interfere with each other

### Why Adapter Pattern?

- **Flexibility**: Organisations choose their design system
- **Maintainability**: Core logic separate from UI
- **Extensibility**: Community can add adapters
- **Testability**: Can mock adapters
- **Simplicity**: Clear separation of concerns

### Why No Client-Side Routing Between SPAs?

- **Simplicity**: No router library needed
- **Isolation**: Page reloads provide automatic cleanup
- **Static Hosting**: Works on any file server
- **No URL Rewrites**: Each route has its own index.html

### Why is `AuthAdapter` Required, With a No-op Default?

- **One Contract, No Silent Gaps**: If `auth` were optional, it would be easy for an adapter to simply forget it, and nobody would notice until a real user hit an expired session in production
- **But Never a Blocker**: `NoopAuthAdapter` implements the interface by declining every prompt, so a new or in-progress adapter still compiles and runs — you just don't get the in-place prompt until you build one
- **Consistency**: Every app calls the same `window.shell.auth.reauthenticate()`, regardless of which adapter is behind it

### Why Build-Time i18n?

- **Performance**: Zero runtime overhead
- **Simplicity**: No i18n library in production
- **Type Safety**: Compile-time validation
- **Bundle Size**: Only one language per build

## Deployment Architecture

```
CDN/
├── shell/
│   ├── index.html
│   ├── shell.js
│   ├── shell.css
│   ├── navigation.json
│   └── webawesome/           # Web Awesome assets (served from here)
├── customers/
│   ├── index.html            # Copy of shell HTML
│   └── app.js                # Customer SPA bundle
├── orders/
│   ├── index.html
│   └── app.js
└── navigation.json
```

**Key Points:**
- Each app is a separate directory
- Each app has its own `index.html` (copy of shell HTML)
- Web Awesome loaded once by the shell, available to all SPAs
- No URL rewrite rules needed
- Works on S3 + CloudFront, Netlify, or any file server

## Future Enhancements

### Planned
- Material UI adapter
- Adapter certification tests

### Considered
- Client-side routing (rejected for simplicity)
- Runtime i18n (rejected for performance)
- Shared state (rejected for isolation)
- Webpack Module Federation (rejected for complexity)

## Contributing

See [CREATING_ADAPTERS.md](CREATING_ADAPTERS.md) for creating custom design system adapters.
