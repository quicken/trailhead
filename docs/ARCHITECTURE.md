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
│  - Shoelace / CloudScape / Material-UI / etc.          │
│  - Toasts, Dialogs, Busy States                        │
│  - Component Loading                                    │
└─────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Shell Core (`core/shell/src/shell.ts`)

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

### 2. Design System Adapter (`core/shell/src/adapters/`)

Adapters implement the `DesignSystemAdapter` interface:

```typescript
interface DesignSystemAdapter {
  name: string;
  version: string;
  init(shellUrl: string): Promise<void>;
  feedback: FeedbackAdapter;
}
```

**Current Adapters:**
- ✅ **Shoelace** - `@herdingbits/trailhead-shoelace`
- ✅ **CloudScape** - `@herdingbits/trailhead-cloudscape`

**Adapter Responsibilities:**
- Load design system assets
- Implement toast notifications
- Implement modal dialogs
- Implement busy/loading overlays
- Provide consistent UI across all apps

### 3. Contracts Package (`core/contracts/`)

TypeScript type definitions for:
- Shell API (`ShellAPI`, `FeedbackAPI`, `HttpAPI`, `NavigationAPI`)
- Adapter interfaces (`DesignSystemAdapter`, `FeedbackAdapter`)
- Version checking utilities

Apps install this as a dev dependency for type safety.

### 4. Plugin Apps (`apps/*/`)

Independent applications that:
- Use any framework (React, Vue, Svelte, vanilla)
- Expose `window.AppMount(container)` function
- Use `window.shell` API for services
- Load specific shell version via script tag
- Deploy independently

## Data Flow

### App Loading Flow

```
1. User navigates to /customers
2. Shell reads navigation.json
3. Shell finds matching route
4. Shell creates <script> tag for app
5. App loads and calls window.AppMount(container)
6. App renders into container
7. App uses window.shell for services
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
5. New app initializes fresh
```

## Design Decisions

### Why Hard Redirects?

- **True Isolation**: Each app gets a clean slate
- **No Memory Leaks**: Browser handles cleanup
- **Simple**: No complex state management
- **Fast Enough**: Modern browsers are fast
- **No Coordination**: Apps can't interfere with each other

### Why Adapter Pattern?

- **Flexibility**: Organizations choose their design system
- **Maintainability**: Core logic separate from UI
- **Extensibility**: Community can add adapters
- **Testability**: Can mock adapters
- **Simplicity**: Clear separation of concerns

### Why No Client-Side Routing?

- **Simplicity**: No router library needed
- **Isolation**: Page reloads provide automatic cleanup
- **Static Hosting**: Works on any file server
- **No URL Rewrites**: Each route has its own index.html

### Why Build-Time i18n?

- **Performance**: Zero runtime overhead
- **Simplicity**: No i18n library in production
- **Type Safety**: Compile-time validation
- **Bundle Size**: Only one language per build

## Versioning Strategy

Apps control which shell version they load:

```html
<!-- app/index.html -->
<script type="module" src="/shell/1.0.0/shell.js"></script>
<script type="module" src="./app.js"></script>
```

Benefits:
- Apps upgrade shell independently
- No coordination needed
- Gradual migration
- Type safety via contracts package

See [VERSIONING.md](../VERSIONING.md) for details.

## Deployment Architecture

```
CDN/
├── shell/
│   └── 1.0.0/
│       ├── shell.js          # Shell + Shoelace adapter
│       ├── shell.css
│       └── shoelace/         # Design system assets
├── customers/
│   ├── index.html            # Loads shell/1.0.0
│   └── app.js                # Customer app
├── orders/
│   ├── index.html            # Loads shell/1.0.0
│   └── app.js                # Orders app
└── navigation.json           # Shared navigation config
```

**Key Points:**
- Each app is a separate directory
- Each app has its own index.html
- Shell is versioned and immutable
- No URL rewrite rules needed
- Works on S3 + CloudFront

## Future Enhancements

### Planned
- Material-UI adapter
- Adapter certification tests
- Adapter marketplace

### Considered
- Client-side routing (rejected for simplicity)
- Runtime i18n (rejected for performance)
- Shared state (rejected for isolation)
- Webpack Module Federation (rejected for complexity)

## Contributing

See [CREATING_ADAPTERS.md](CREATING_ADAPTERS.md) for creating custom design system adapters.
