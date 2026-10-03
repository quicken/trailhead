# Trailhead Documentation

The docs, in the order most people want them. New to Trailhead? Read top to bottom. Already building? Jump to the one you need.

1. **[Problem Statement](../PROBLEM_STATEMENT.md)** — *Why does this exist?* The case for a reload-based micro-frontend shell over Module Federation, single-spa, and iframes, and the trade-offs it accepts to stay simple.

2. **[Architecture Overview](./ARCHITECTURE.md)** — *How does it work?* The shell / adapter / app layering, the `AppMount` contract, the data-flow for app loading, feedback, navigation, and both session-recovery strategies, and the deliberate design decisions behind each.

3. **[Getting Started](./GETTING_STARTED.md)** — *Build one.* A shell and a first SPA end to end: the real two-server dev loop, the production assembly, and session-expiry handling for both auth strategies.

4. **[Shell API](./SHELL_API.md)** — *The reference to keep open.* Everything an app can call on `window.shell`: feedback, the `Result<T>` HTTP client, navigation, and both auth methods, with runnable examples.

5. **[Creating Adapters](./CREATING_ADAPTERS.md)** — *Bring your own design system.* Implement `DesignSystemAdapter` to back the shell's UI with any component library, including the credential prompt (and when you don't need one).

6. **[Deployment](./DEPLOYMENT.md)** — *Ship it.* Static hosting on nginx, S3 + CloudFront, or any file server, plus the aws-static-hosting Cognito gateway path.

## Reading paths

- **App developer** (building a SPA to run in a shell): [Getting Started](./GETTING_STARTED.md) → [Shell API](./SHELL_API.md). Reach for [Architecture](./ARCHITECTURE.md) when you want the *why*.
- **Platform owner** (standing up and deploying the shell): [Architecture](./ARCHITECTURE.md) → [Deployment](./DEPLOYMENT.md).
- **Adapter author** (supporting a new design system): [Architecture → adapter pattern](./ARCHITECTURE.md#why-the-adapter-pattern) → [Creating Adapters](./CREATING_ADAPTERS.md).

See also the project [README](../README.md), the [CHANGELOG](../CHANGELOG.md), and the [herdingbits blog series](https://www.herdingbits.com/blog/building-trailhead-micro-frontend-framework).
