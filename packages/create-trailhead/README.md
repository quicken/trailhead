# @herdingbits/create-trailhead

Scaffold a new Trailhead application shell with a single command.

## Usage

```bash
npx @herdingbits/create-trailhead my-app
```

## Options

```
npx @herdingbits/create-trailhead <project-name> [options]

Options:
  --design-system <name>   Design system to use (webawesome|cloudscape)
  --no-demo               Skip creating demo app
  --help, -h              Show help message
```

## Examples

### Create with Web Awesome (default)
```bash
npx @herdingbits/create-trailhead my-app
```

### Create with CloudScape
```bash
npx @herdingbits/create-trailhead my-app --design-system cloudscape
```

### Create without demo app
```bash
npx @herdingbits/create-trailhead my-app --no-demo
```

## What Gets Created

```
my-app/
├── shell/                  # Application shell
│   ├── src/
│   ├── public/
│   │   └── shell.json
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── apps/
│   └── demo/              # Demo SPA (if --no-demo not specified)
│       ├── src/
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
├── deploy.js              # Deployment assembly script
├── package.json
└── README.md
```

## Next Steps

After creating your project:

```bash
# Install and start shell
cd my-app/shell
npm install
npm start  # Port 3001

# In another terminal, install and start demo app
cd my-app/apps/demo
npm install
npm start  # Port 3000

# Visit http://localhost:3001
```

## Adding New Apps

Copy the demo app structure:

```bash
cd my-app
cp -r apps/demo apps/users
```

Add your new app to `shell/public/shell.json`:

```json
{
  "apps": [
    { "id": "demo", "basePath": "/demo", "src": "demo" },
    { "id": "users", "basePath": "/users", "src": "users" }
  ],
  "nav": [
    {
      "type": "section",
      "label": "Applications",
      "icon": "grid",
      "order": 1,
      "children": [
        { "type": "link", "label": "Demo", "icon": "star", "order": 1, "href": "/demo" },
        { "type": "link", "label": "Users", "icon": "users", "order": 2, "href": "/users" }
      ]
    }
  ]
}
```

## Documentation

- [Trailhead Documentation](https://github.com/quicken/trailhead)
- [Getting Started Guide](https://github.com/quicken/trailhead/blob/main/docs/GETTING_STARTED.md)

## License

MIT
