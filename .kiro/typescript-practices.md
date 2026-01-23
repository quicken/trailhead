# TypeScript Best Practices for Trailhead

## Code Style & Patterns

### Minimal, Direct Code
- Write only essential code that directly solves the problem
- Avoid verbose implementations and unnecessary abstractions
- No boilerplate unless required for functionality

### TypeScript Conventions
- Use explicit type imports: `import type { ShellAPI } from "./types/shell-api"`
- Define interfaces for public APIs and contracts
- Use type inference where obvious, explicit types for public interfaces
- Prefer `interface` over `type` for object shapes

### Module System
- Use ES modules exclusively (`type: "module"` in package.json)
- Use Vite's `import.meta.env` for environment variables
- Dynamic imports with `/* @vite-ignore */` comment when loading runtime paths

### File Organization
```
package/
├── src/
│   ├── lib/           # Reusable utilities
│   ├── types/         # Type definitions
│   └── index.ts       # Main entry point
├── translations/      # i18n files (de.json, template.json)
├── vite.config.js     # Build configuration
└── package.json
```

## Build Configuration

### Vite Setup
- Use `defineConfig` with mode-based environment loading
- Configure `base` path from `VITE_BASE_PATH` env variable
- Enable CORS for dev server when building micro-frontends

### Library Build (Apps)
```javascript
build: {
  lib: {
    entry: "src/index.tsx",
    formats: ["es"],
    fileName: () => "app.js",
  },
  rollupOptions: {
    output: {
      inlineDynamicImports: true,  // Single file output
    },
  },
}
```

### Shell Build
```javascript
build: {
  rollupOptions: {
    output: {
      entryFileNames: "shell.js",
      assetFileNames: "shell.[ext]",
    },
  },
  copyPublicDir: true,  // Copy public assets
}
```

## Internationalization (i18n)

### Build-Time Translation
- Use custom `i18nPlugin` for zero runtime overhead
- Translations replaced at build time: `t("key")` → `"translated value"`
- One build per language (e.g., `vite.config.de.js` for German)

### Translation Files
- `translations/template.json` - Source strings extracted from code
- `translations/de.json` - German translations
- Scripts: `i18n:extract` and `i18n:validate`

### Usage in Code
```typescript
import { t } from "./lib/i18n";

// In code
const message = t("Loading...");
```

## Testing

### Vitest Configuration
```javascript
test: {
  globals: true,
  environment: "jsdom",
}
```

### Test Files
- Place in `__tests__/` directories
- Name pattern: `*.test.ts` or `*.test.tsx`
- Only write tests when explicitly requested

## Dependencies

### Workspace Packages
- Use `file:` protocol for local packages: `"@cfkit/contracts": "file:../../core/contracts"`
- Shared packages: `@cfkit/contracts`, `@cfkit/vite-i18n-plugin`

### External Libraries
- Shell uses: `@shoelace-style/shoelace`, `ky` (HTTP client)
- Apps bundle their own frameworks (React, Vue, etc.)
- No externalization - apps are self-contained

## Environment Variables

### Development
- `.env.development` for dev-specific config
- `VITE_BASE_PATH` - Base URL path for deployment
- `VITE_PLUGIN_PORT_<APPNAME>` - Dev server ports for apps

### Production
- Environment variables baked into build
- No runtime configuration needed

## Code Quality

### Error Handling
- Use try-catch for async operations
- Log errors with context: `console.error("Failed to load:", error)`
- Provide user-friendly fallbacks

### Async Patterns
- Use async/await consistently
- Return promises from async functions
- Handle promise rejections explicitly

### Type Safety
- No `any` types in public APIs
- Use type guards for runtime checks
- Leverage TypeScript's strict mode

## Performance

### Bundle Optimization
- Single file output per app (`inlineDynamicImports: true`)
- Tree-shaking enabled by default
- No code splitting for micro-frontend apps

### Loading Strategy
- Shell loads first (21 KB)
- Apps loaded on-demand via dynamic script injection
- Shoelace components loaded once by shell

## Security

### No Secrets in Code
- Never commit API keys or tokens
- Use environment variables for sensitive config
- Placeholder values in examples: `<api-key>`, `<token>`

### Content Security
- CORS enabled for cross-origin dev servers
- Validate external data before use
- Sanitize user inputs in UI components
