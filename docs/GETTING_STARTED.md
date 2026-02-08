# Getting Started with Trailhead

This tutorial walks you through setting up Trailhead in your own project using the Shoelace design system. You'll create a shell and your first single page application (SPA).

## What You'll Build

- An application shell that provides navigation and shared services
- A demo SPA that uses the shell's HTTP client and feedback system
- A production-ready deployment structure

## Prerequisites

- Node.js 18+ and npm
- Basic knowledge of TypeScript and React (or your preferred framework)
- Familiarity with Vite

## Project Structure

We'll create this structure:

```
my-app/
├── shell/                  # Application shell
│   ├── src/
│   │   └── index.ts
│   ├── public/
│   │   └── navigation.json
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── apps/
    └── demo/              # Your first SPA
        ├── src/
        │   └── index.tsx
        ├── index.html
        ├── vite.config.js
        └── package.json
```

## Step 1: Create the Shell

### 1.1 Initialize the Shell Project

```bash
mkdir -p my-app/shell
cd my-app/shell
npm init -y
```

### 1.2 Install Dependencies

```bash
npm install @herdingbits/trailhead-core @herdingbits/trailhead-shoelace
npm install -D vite typescript
```

### 1.3 Create TypeScript Configuration

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

### 1.4 Create Shell Entry Point

Create `src/index.ts`:

```typescript
import { Trailhead } from '@herdingbits/trailhead-core';
import { ShoelaceAdapter, ShellApp } from '@herdingbits/trailhead-shoelace';
import '@herdingbits/trailhead-shoelace/shell.css';

// Get configuration
const basePath = import.meta.env.VITE_BASE_PATH || '';
const apiUrl = (window as any).APP_CONFIG?.apiUrl || '';

// Initialize shell with Shoelace adapter
const shell = new Trailhead({
  adapter: new ShoelaceAdapter(),
  basePath,
  apiUrl,
});

ShellApp.mount(shell);

console.log('[Shell] Initialized');
```

### 1.5 Create HTML Entry Point

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Application</title>
    
    <!-- Shoelace Design System -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.15.0/cdn/themes/light.css" />
    
    <!-- Optional: Runtime configuration -->
    <script>
      window.APP_CONFIG = {
        apiUrl: 'https://api.example.com'
      };
    </script>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/index.ts"></script>
  </body>
</html>
```

### 1.6 Create Navigation Configuration

Create `public/navigation.json`:

```json
[
  {
    "id": "demo",
    "path": "/demo",
    "app": "demo",
    "icon": "house",
    "label": "Demo",
    "order": 1
  }
]
```

### 1.7 Configure Vite

Create `vite.config.js`:

```javascript
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH ? `${env.VITE_BASE_PATH}/` : '/';

  return {
    base,
    server: {
      port: 3001,
      open: true,
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          entryFileNames: 'shell.js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === 'style.css') return 'shell.css';
            return assetInfo.name;
          },
        },
      },
    },
  };
});
```

### 1.8 Add Scripts to package.json

Update `package.json`:

```json
{
  "name": "my-app-shell",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### 1.9 Create Development Environment File

Create `.env.development`:

```bash
# Base path (empty for root)
VITE_BASE_PATH=
```

**Note:** In the current implementation, the shell loads SPAs from their built output. For hot reload during development, run each SPA in standalone mode on its own port.

## Step 2: Create Your First SPA

### 2.1 Initialize the SPA Project

```bash
cd ..
mkdir -p apps/demo
cd apps/demo
npm init -y
```

### 2.2 Install Dependencies

```bash
npm install react react-dom
npm install -D vite typescript @vitejs/plugin-react @types/react @types/react-dom
npm install -D @herdingbits/trailhead-types
```

### 2.3 Create TypeScript Configuration

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

### 2.4 Create SPA Entry Point

Create `src/index.tsx`:

```typescript
import type { ShellAPI } from '@herdingbits/trailhead-types';
import { createRoot } from 'react-dom/client';
import { DemoApp } from './DemoApp';

/**
 * SPA initialization function called by the shell
 */
export function init(shell: ShellAPI) {
  const container = document.getElementById('app-content');
  if (!container) {
    console.error('[Demo] Container #app-content not found');
    return;
  }

  const root = createRoot(container);
  root.render(<DemoApp shell={shell} />);
  
  console.log('[Demo] Mounted');
}

/**
 * Standalone development mode
 */
if (import.meta.env.DEV && !window.shell) {
  // Mock shell API for standalone development
  window.shell = {
    version: '1.0.0-dev',
    feedback: {
      busy: (msg) => console.log('[Mock] busy:', msg),
      clear: () => console.log('[Mock] clear'),
      success: (msg) => console.log('[Mock] success:', msg),
      error: (msg) => console.error('[Mock] error:', msg),
      warning: (msg) => console.warn('[Mock] warning:', msg),
      info: (msg) => console.log('[Mock] info:', msg),
      alert: (msg) => console.log('[Mock] alert:', msg),
      confirm: async (msg) => {
        console.log('[Mock] confirm:', msg);
        return window.confirm(msg);
      },
      ok: async (msg) => {
        console.log('[Mock] ok:', msg);
        window.alert(msg);
      },
      yesNo: async (msg) => {
        console.log('[Mock] yesNo:', msg);
        return window.confirm(msg);
      },
      yesNoCancel: async (msg) => {
        console.log('[Mock] yesNoCancel:', msg);
        const result = window.confirm(msg);
        return result ? 'yes' : 'no';
      },
      custom: async () => null,
    },
    http: {
      get: async (url) => {
        console.log('[Mock] GET:', url);
        return { success: true, data: { message: 'Mock data' } };
      },
      post: async (url, data) => {
        console.log('[Mock] POST:', url, data);
        return { success: true, data: { message: 'Mock response' } };
      },
      put: async (url, data) => {
        console.log('[Mock] PUT:', url, data);
        return { success: true, data: { message: 'Mock response' } };
      },
      patch: async (url, data) => {
        console.log('[Mock] PATCH:', url, data);
        return { success: true, data: { message: 'Mock response' } };
      },
      delete: async (url) => {
        console.log('[Mock] DELETE:', url);
        return { success: true, data: { message: 'Mock response' } };
      },
    },
    navigation: {
      navigate: (path) => console.log('[Mock] navigate:', path),
      getCurrentPath: () => '/demo',
      onRouteChange: () => () => {},
    },
  };

  // Auto-mount for standalone dev
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(<DemoApp shell={window.shell} />);
  }
}
```

### 2.5 Create the App Component

Create `src/DemoApp.tsx`:

```typescript
import type { ShellAPI } from '@herdingbits/trailhead-types';
import { useState } from 'react';

interface DemoAppProps {
  shell: ShellAPI;
}

export function DemoApp({ shell }: DemoAppProps) {
  const [count, setCount] = useState(0);
  const [data, setData] = useState<any>(null);

  const handleIncrement = () => {
    setCount(count + 1);
    shell.feedback.success(`Count is now ${count + 1}`);
  };

  const handleFetchData = async () => {
    const result = await shell.http.get('/api/data', {
      busyMessage: 'Loading data...',
      successMessage: 'Data loaded!',
      showSuccess: true,
    });

    if (result.success) {
      setData(result.data);
    }
  };

  const handleConfirm = async () => {
    const confirmed = await shell.feedback.confirm(
      'Are you sure you want to do this?',
      'Confirm Action'
    );

    if (confirmed) {
      shell.feedback.success('Action confirmed!');
    } else {
      shell.feedback.info('Action cancelled');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Demo Application</h1>
      <p>This is a demo SPA using the Trailhead shell.</p>

      <div style={{ marginTop: '2rem' }}>
        <h2>Counter Example</h2>
        <p>Count: {count}</p>
        <sl-button variant="primary" onClick={handleIncrement}>
          Increment
        </sl-button>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>HTTP Client Example</h2>
        <sl-button variant="primary" onClick={handleFetchData}>
          Fetch Data
        </sl-button>
        {data && (
          <pre style={{ marginTop: '1rem', padding: '1rem', background: '#f5f5f5' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>Feedback Example</h2>
        <sl-button variant="primary" onClick={handleConfirm}>
          Show Confirmation
        </sl-button>
      </div>
    </div>
  );
}
```

### 2.6 Create HTML for Standalone Development

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Demo App - Standalone</title>
    
    <!-- Shoelace Design System -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.15.0/cdn/themes/light.css" />
    <script type="module" src="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.15.0/cdn/shoelace-autoloader.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
```

### 2.7 Configure Vite

Create `vite.config.js`:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    cors: true,
  },
  build: {
    lib: {
      entry: 'src/index.tsx',
      formats: ['es'],
      fileName: () => 'app.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
```

### 2.8 Add Scripts to package.json

Update `package.json`:

```json
{
  "name": "demo-app",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

## Step 3: Development Workflow

### 3.1 Standalone SPA Development (Recommended)

Develop your SPA independently with hot reload:

```bash
cd my-app/apps/demo
npm run dev
```

Open `http://localhost:3000` to see the SPA with the mock shell API. This provides the fastest development experience with instant hot reload.

### 3.2 Testing with the Shell

To test the SPA integrated with the shell:

1. Build the SPA:
```bash
cd my-app/apps/demo
npm run build
```

2. Copy the built SPA to the shell's public directory:
```bash
mkdir -p ../shell/public/demo
cp dist/app.js ../shell/public/demo/
```

3. Start the shell:
```bash
cd ../shell
npm run dev
```

4. Open `http://localhost:3000` and click "Demo" in the navigation

### 3.3 Development Tips

**For rapid iteration:**
- Develop SPAs in standalone mode (port 3000)
- Use the mock shell API for testing
- Only test with the shell when you need to verify integration

**For integration testing:**
- Build the SPA
- Copy to shell's public directory
- Test in the shell

**Production-like testing:**
- Use the preview server (see Step 4)

## Step 4: Build for Production

### 4.1 Build the Shell

```bash
cd my-app/shell
npm run build
```

Output in `shell/dist/`:
- `index.html`
- `shell.js`
- `shell.css`
- `navigation.json`

### 4.2 Build the Demo SPA

```bash
cd my-app/apps/demo
npm run build
```

Output in `apps/demo/dist/`:
- `app.js`

### 4.3 Create Deployment Structure

Create a deployment directory:

```bash
mkdir -p deploy
cp shell/dist/* deploy/
mkdir -p deploy/demo
cp apps/demo/dist/app.js deploy/demo/
cp shell/dist/index.html deploy/demo/
```

Your deployment structure:

```
deploy/
├── index.html
├── shell.js
├── shell.css
├── navigation.json
└── demo/
    ├── index.html
    └── app.js
```

### 4.4 Deploy to Static Host

Upload the `deploy/` directory to any static file host:

- **AWS S3 + CloudFront**
- **Netlify**
- **Vercel**
- **GitHub Pages**
- **Any web server**

No URL rewrites needed between SPAs - each route has its own `index.html`.

## Step 5: Add More SPAs

### 5.1 Create a New SPA

```bash
cd my-app/apps
mkdir users
cd users
# Follow steps 2.1-2.8 with "users" instead of "demo"
```

### 5.2 Add to Navigation

Update `shell/public/navigation.json`:

```json
[
  {
    "id": "demo",
    "path": "/demo",
    "app": "demo",
    "icon": "house",
    "label": "Demo",
    "order": 1
  },
  {
    "id": "users",
    "path": "/users",
    "app": "users",
    "icon": "people",
    "label": "Users",
    "order": 2
  }
]
```

### 5.3 Development Workflow

For each new SPA, develop in standalone mode, then copy the build to the shell for integration testing:

```bash
# Develop
cd my-app/apps/users
npm run dev  # Port 3000

# Test with shell
npm run build
mkdir -p ../shell/public/users
cp dist/app.js ../shell/public/users/
```

The navigation menu updates automatically - no rebuild needed!

## Next Steps

### Using Different Frameworks

Each SPA can use any framework:

- **React** - Follow this tutorial
- **Vue** - Use `@vitejs/plugin-vue`
- **Svelte** - Use `@sveltejs/vite-plugin-svelte`
- **Vanilla JS** - No framework needed

Just export the `init(shell)` function and you're good to go.

### Adding Internationalization

See the [i18n plugin documentation](../tools/vite-i18n-plugin/README.md) for build-time translations.

### Custom Design Systems

Want to use a different design system? See [Creating Adapters](./CREATING_ADAPTERS.md).

### CloudScape (React)

For a React-first architecture with AWS CloudScape:

```bash
npm install @herdingbits/trailhead-cloudscape @cloudscape-design/components
```

See the [CloudScape example](../examples/cloudscape-site/) for details.

## Troubleshooting

### SPA Not Loading

1. Check that the SPA is built (`npm run build` in the SPA directory)
2. Verify the built `app.js` is in `shell/public/<app-name>/`
3. Check browser console for loading errors
4. Verify `navigation.json` has the correct path

### Navigation Not Updating

1. Verify `navigation.json` is in `shell/public/`
2. Check JSON syntax is valid
3. Restart the shell dev server

### Type Errors

1. Ensure `@herdingbits/trailhead-types` is installed
2. Check `tsconfig.json` has correct settings
3. Restart TypeScript server in your editor

## Summary

You've learned how to:

✅ Create an application shell with Shoelace  
✅ Build a SPA that uses shell services  
✅ Run in development mode with hot reload  
✅ Build and deploy for production  
✅ Add multiple SPAs to your application  

The shell provides shared infrastructure while each SPA focuses on business logic. Deploy independently, use any framework, and scale to dozens of modules without coordination overhead.

**Happy building!** 🚀
