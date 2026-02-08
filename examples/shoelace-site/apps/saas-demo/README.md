# SaaS Demo App

Simple user management single page application demonstrating shell integration.

## Features

- User list with load/delete operations
- Uses shell HTTP API for data fetching
- Uses shell feedback API for user notifications
- Build-time i18n (English + German)
- Shoelace components (provided by shell)

## Development

```bash
npm install
npm start  # Port 3002 (standalone mode)
```

## Build

```bash
npm run build        # English
npm run build:de     # German
npm run build:all    # All languages
```

## i18n Workflow

```bash
npm run i18n:extract    # Extract strings
npm run i18n:validate   # Validate translations
```

## Bundle Size

- 322 KB (73.7 KB gzipped) - includes React
