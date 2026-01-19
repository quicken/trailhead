# Trailhead - A Micro-Frontend Experiment

**What if micro-frontends didn't need webpack magic or complex tooling?** Just the browser's native module system and some common sense?

This is Trailhead - a rainy Sunday experiment for building a functional micro-frontend shell with a focus on simple. A 21 KB vanilla TypeScript shell that lets you deploy many independent apps as scale without coordination, URL rewrites, or framework lock-in.

**[Read the full story →](https://www.herdingbits.com/blog/building-trailhead-micro-frontend-framework)** | **[Try it live →](https://www.herdingbits.com/sample-code/trailhead)**

---

## What is Trailhead?

Trailhead is a proof-of-concept micro-frontend shell built on a simple premise: **what if we just used the browser's native module system and minimal tooling?**

The shell is a lightweight vanilla TypeScript application (21 KB) that provides core services to independent plugin applications. Each app can use any framework - React, Vue, Svelte, or vanilla JavaScript - and can be deployed independently without affecting other apps.

## The Shell's Purpose

The shell acts as your application's **service layer**, providing:

- **Navigation Management**: Automatically builds the navigation menu from a simple JSON configuration
- **HTTP Client**: Centralized API calls with automatic error handling, loading states, and authentication
- **User Feedback**: Consistent toasts, dialogs, and loading overlays across all apps
- **Shared UI Components**: Shoelace web components loaded once and available to all apps
- **Routing**: Simple page-based navigation that works on any static file server

Apps don't worry about infrastructure - they focus purely on business logi, think of them as extension in vscode or browser plugins.

## Key Features

- **Framework Agnostic**: Use React, Vue, Svelte, or vanilla JavaScript - the shell doesn't care
- **Independent Deployment**: Deploy one app without touching the other 79
- **Zero Configuration Deployment**: No URL rewrite rules, no CloudFront complexity - just upload files
- **Build-time i18n**: Zero runtime overhead for translations
- **True Isolation**: Page reloads provide automatic CSS and JavaScript isolation
- **Shared Infrastructure**: Main Menu for Navigation, HTTP, and feedback handled by the shell. (Menu accross all apps can be updated in all app as once at runtime via JSON)

## Demo Application

The demo app showcases how applications interact with the shell's services:

- Uses shell's HTTP client for API calls
- Displays feedback using shell's toast notifications
- Leverages Shoelace components provided by the shell
- Demonstrates framework-agnostic architecture

All apps share these UI elements and services without importing libraries or managing state.

## Dynamic Navigation

Update `navigation.json` to add, remove, or reorder menu items - **no rebuild required**. The shell reads this configuration at runtime and automatically updates the navigation menu across all applications.

```json
{
  "id": "customers",
  "path": "/customers",
  "app": "customers",
  "icon": "people",
  "label": "Customers"
}
```

Add a new app? Just add a JSON entry. The menu updates instantly.

## Project Structure

```
trailhead/
├── core/
│   ├── shell/             # Vanilla TypeScript shell (21 KB)
│   └── contracts/         # Shell API type definitions
├── apps/
│   ├── demo/              # React demo app
│   └── saas-demo/         # SaaS example app
└── tools/
    ├── vite-i18n-plugin/  # Build-time i18n
    └── preview-server/    # Local production preview
```

## Quick Start

```bash
# Install dependencies
npm install

# Start shell (port 3000)
cd core/shell && npm start

# Start demo app (port 3001)
cd apps/demo && npm start

# Visit http://localhost:3000
```

## Production Preview

```bash
cd tools/preview-server
npm run build  # Builds all apps
npm start      # Serves at http://localhost:8081/sample/trailhead
```

## Learn More

Read the full article: [Building Trailhead - A Rainy Day Micro-Frontend Experiment](https://www.herdingbits.com/blog/building-trailhead-micro-frontend-framework)

The article covers:
- Architecture decisions and tradeoffs
- Performance analysis (page reloads vs client-side routing)
- Deployment on AWS (S3 + CloudFront)
- Scaling to 80+ modules
- The React exit strategy

## License

MIT License - See [LICENSE](LICENSE) file for details
