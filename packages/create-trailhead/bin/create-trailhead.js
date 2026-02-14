#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);

// Show help
if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  console.log(`
create-trailhead - Create a new Trailhead application shell

Usage:
  npx @herdingbits/create-trailhead <project-name> [options]

Options:
  --design-system <name>   Design system to use (shoelace|cloudscape)
  --no-demo               Skip creating demo app
  --help, -h              Show this help message

Examples:
  npx @herdingbits/create-trailhead my-app
  npx @herdingbits/create-trailhead my-app --design-system cloudscape
  npx @herdingbits/create-trailhead my-app --no-demo

After creating your project:
  cd my-app/shell && npm install
  cd ../apps/demo && npm install
  cd ../shell && npm start
`);
  process.exit(0);
}

// Parse arguments
const projectName = args[0];
const designSystemArg = args.indexOf('--design-system');
const designSystem = designSystemArg !== -1 ? args[designSystemArg + 1] : 'shoelace';
const createDemo = !args.includes('--no-demo');

// Validate
if (!projectName) {
  console.error('Error: Project name is required');
  console.log('Run with --help for usage information');
  process.exit(1);
}

if (!['shoelace', 'cloudscape'].includes(designSystem)) {
  console.error('Error: Design system must be either "shoelace" or "cloudscape"');
  process.exit(1);
}

const projectPath = resolve(process.cwd(), projectName);

if (existsSync(projectPath)) {
  console.error(`Error: Directory "${projectName}" already exists`);
  process.exit(1);
}

console.log(`Creating Trailhead project: ${projectName}`);
console.log(`Design system: ${designSystem}`);
console.log('');

// Create project structure
mkdirSync(projectPath, { recursive: true });
mkdirSync(join(projectPath, 'apps'), { recursive: true });

// Copy shell template
console.log('Creating shell...');
const shellTemplate = join(__dirname, '../templates', `${designSystem}-shell`);
cpSync(shellTemplate, join(projectPath, 'shell'), {
  recursive: true,
  filter: (src) => {
    const name = src.split('/').pop();
    return name !== 'node_modules' && name !== 'dist' && name !== '.env.development';
  }
});

// Copy demo app if requested
if (createDemo) {
  console.log('Creating demo app...');
  const appTemplate = join(__dirname, '../templates', `${designSystem}-app`);
  cpSync(appTemplate, join(projectPath, 'apps/demo'), {
    recursive: true,
    filter: (src) => {
      const name = src.split('/').pop();
      return name !== 'node_modules' && name !== 'dist';
    }
  });
}

// Create deployment script
console.log('Creating deployment script...');
const deployScript = `#!/usr/bin/env node
/**
 * Deployment assembly script
 * Assembles pre-built shell and apps into deployment structure
 */

import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_PATH = process.env.BASE_PATH || '';
const OUTPUT_DIR = join(__dirname, 'dist');

console.log('Assembling ${projectName} for deployment...');
console.log(\`Base path: \${BASE_PATH || '(root)'}\`);
console.log(\`Output: \${OUTPUT_DIR}\\n\`);

// Check shell is built
const shellDist = join(__dirname, 'shell/dist');
if (!existsSync(shellDist)) {
  console.error('Error: Shell not built. Run: cd shell && npm run build');
  process.exit(1);
}

// Clean output directory
console.log('1. Cleaning output directory...');
rmSync(OUTPUT_DIR, { recursive: true, force: true });
mkdirSync(OUTPUT_DIR, { recursive: true });

// Copy shell build
console.log('\\n2. Copying shell...');
cpSync(shellDist, OUTPUT_DIR, { recursive: true });

// Read navigation to determine which apps to assemble
const navigation = JSON.parse(readFileSync(join(OUTPUT_DIR, 'navigation.json'), 'utf-8'));
const indexTemplate = readFileSync(join(OUTPUT_DIR, 'index.html'), 'utf-8');

// Copy each app
let step = 3;
navigation.forEach(route => {
  const appName = route.app;
  const routePath = route.path.substring(1);
  const appDist = join(__dirname, 'apps', appName, 'dist');
  
  if (!existsSync(appDist)) {
    console.error(\`\\nError: App "\${appName}" not built. Run: cd apps/\${appName} && npm run build\`);
    process.exit(1);
  }
  
  console.log(\`\\n\${step}. Copying \${appName} app to \${routePath}/...\`);
  const routeDir = join(OUTPUT_DIR, routePath);
  mkdirSync(routeDir, { recursive: true });
  
  cpSync(join(appDist, 'app.js'), join(routeDir, 'app.js'));
  
  try {
    const distFiles = readdirSync(appDist);
    const cssFile = distFiles.find(f => f.endsWith('.css'));
    if (cssFile) {
      cpSync(join(appDist, cssFile), join(routeDir, \`\${appName}.css\`));
      console.log(\`  Copied \${cssFile} as \${appName}.css\`);
    }
  } catch (e) {
    console.log(\`  No CSS file for \${appName}\`);
  }
  
  writeFileSync(join(routeDir, 'index.html'), indexTemplate);
  console.log(\`  Created \${routePath}/index.html and \${routePath}/app.js\`);
  step++;
});

console.log('\\n✓ Deployment assembly complete!');
console.log(\`\\nOutput directory: \${OUTPUT_DIR}\`);
console.log('\\nTo deploy, upload the contents of dist/ to your web server.');
`;

writeFileSync(join(projectPath, 'deploy.js'), deployScript);

// Create package.json
console.log('Creating package.json...');
const packageJson = {
  name: projectName,
  version: '0.0.1',
  private: true,
  type: 'module',
  scripts: {
    deploy: 'node deploy.js'
  }
};

writeFileSync(join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2));

// Create README
console.log('Creating README...');
const readme = `# ${projectName}

Trailhead application with ${designSystem} design system.

## Development

### Start Shell
\`\`\`bash
cd shell
npm install
npm start  # Port 3001
\`\`\`

### Start App
\`\`\`bash
cd apps/demo
npm install
npm start  # Port 3000
\`\`\`

Visit http://localhost:3001

## Production Build

### Build Shell
\`\`\`bash
cd shell
npm run build
\`\`\`

### Build Apps
\`\`\`bash
cd apps/demo
npm run build
\`\`\`

### Assemble Deployment
\`\`\`bash
npm run deploy
\`\`\`

Output in \`dist/\` directory.

## Adding New Apps

1. Copy the demo app structure:
\`\`\`bash
cp -r apps/demo apps/my-app
\`\`\`

2. Update \`shell/public/navigation.json\`:
\`\`\`json
{
  "id": "my-app",
  "path": "/my-app",
  "app": "my-app",
  "icon": "star",
  "label": "My App",
  "order": 2
}
\`\`\`

3. Build and run:
\`\`\`bash
cd apps/my-app
npm install
npm start
\`\`\`

## Documentation

- [Trailhead Documentation](https://github.com/quicken/trailhead)
- [Getting Started Guide](https://github.com/quicken/trailhead/blob/main/docs/GETTING_STARTED.md)
`;

writeFileSync(join(projectPath, 'README.md'), readme);

// Create .gitignore
const gitignore = `node_modules/
dist/
.DS_Store
*.log
.env.local
`;

writeFileSync(join(projectPath, '.gitignore'), gitignore);

console.log('');
console.log('✓ Project created successfully!');
console.log('');
console.log('Next steps:');
console.log(`  cd ${projectName}/shell`);
console.log('  npm install');
console.log('  npm start');
console.log('');
console.log('Then in another terminal:');
console.log(`  cd ${projectName}/apps/demo`);
console.log('  npm install');
console.log('  npm start');
console.log('');
console.log('Visit http://localhost:3001');
