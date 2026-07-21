import chalk from 'chalk';
import type { ArchitectureSchema, Framework } from '../parser.js';
import { createFile } from '../utils/fs.js';

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface ScaffoldPlan {
  files: GeneratedFile[];
}

interface FrameworkTemplate {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  /** Files unrelated to styling. */
  files: (schema: ArchitectureSchema) => GeneratedFile[];
  /** Where Tailwind's stylesheet is imported from, if Tailwind is selected. */
  tailwind?: {
    contentGlobs: string[];
    stylesheetPath: string;
  };
}

const TS_VERSION = '^5.5.0';

const NEXT_TEMPLATE: FrameworkTemplate = {
  dependencies: { next: '^14.2.5', react: '^18.3.1', 'react-dom': '^18.3.1' },
  devDependencies: {
    typescript: TS_VERSION,
    '@types/node': '^20.14.0',
    '@types/react': '^18.3.3',
    '@types/react-dom': '^18.3.0',
  },
  scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
  tailwind: {
    contentGlobs: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
    stylesheetPath: 'app/globals.css',
  },
  files: (schema) => [
    {
      path: 'next.config.mjs',
      content: `/** @type {import('next').NextConfig} */\nconst nextConfig = {};\n\nexport default nextConfig;\n`,
    },
    {
      path: 'tsconfig.json',
      content: JSON.stringify(
        {
          compilerOptions: {
            lib: ['dom', 'dom.iterable', 'esnext'],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: 'esnext',
            moduleResolution: 'bundler',
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: 'preserve',
            incremental: true,
            plugins: [{ name: 'next' }],
          },
          include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
          exclude: ['node_modules'],
        },
        null,
        2,
      ),
    },
    {
      path: 'app/layout.tsx',
      content: `${schema.styling === 'Tailwind CSS' ? "import './globals.css';\n\n" : ''}export const metadata = {
  title: '${schema.name}',
  description: 'Scaffolded by Auto-Architect',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
    },
    {
      path: 'app/page.tsx',
      content: `export default function Home() {
  return (
    <main${schema.styling === 'Tailwind CSS' ? ' className="flex min-h-screen flex-col items-center justify-center p-24"' : ''}>
      <h1${schema.styling === 'Tailwind CSS' ? ' className="text-4xl font-bold"' : ''}>Welcome to ${schema.name}</h1>
      <p>Scaffolded with Auto-Architect.</p>
    </main>
  );
}
`,
    },
  ],
};

const REACT_VITE_TEMPLATE: FrameworkTemplate = {
  dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1' },
  devDependencies: {
    '@types/react': '^18.3.3',
    '@types/react-dom': '^18.3.0',
    '@vitejs/plugin-react': '^4.3.1',
    typescript: TS_VERSION,
    vite: '^5.4.0',
  },
  scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
  tailwind: {
    contentGlobs: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    stylesheetPath: 'src/index.css',
  },
  files: (schema) => [
    {
      path: 'index.html',
      content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${schema.name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    },
    {
      path: 'vite.config.ts',
      content: `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n});\n`,
    },
    {
      path: 'tsconfig.json',
      content: JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2020',
            lib: ['ES2020', 'DOM', 'DOM.Iterable'],
            module: 'ESNext',
            moduleResolution: 'bundler',
            jsx: 'react-jsx',
            strict: true,
            skipLibCheck: true,
            isolatedModules: true,
            noEmit: true,
          },
          include: ['src'],
        },
        null,
        2,
      ),
    },
    {
      path: 'src/main.tsx',
      content: `import React from 'react';
import ReactDOM from 'react-dom/client';
${schema.styling === 'Tailwind CSS' ? "import './index.css';\n" : ''}import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`,
    },
    {
      path: 'src/App.tsx',
      content: `export default function App() {
  return (
    <main${schema.styling === 'Tailwind CSS' ? ' className="flex min-h-screen flex-col items-center justify-center p-24"' : ''}>
      <h1${schema.styling === 'Tailwind CSS' ? ' className="text-4xl font-bold"' : ''}>Welcome to ${schema.name}</h1>
      <p>Scaffolded with Auto-Architect.</p>
    </main>
  );
}
`,
    },
  ],
};

const VUE_VITE_TEMPLATE: FrameworkTemplate = {
  dependencies: { vue: '^3.4.31' },
  devDependencies: {
    '@vitejs/plugin-vue': '^5.1.0',
    typescript: TS_VERSION,
    vite: '^5.4.0',
  },
  scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
  tailwind: {
    contentGlobs: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
    stylesheetPath: 'src/style.css',
  },
  files: (schema) => [
    {
      path: 'index.html',
      content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${schema.name}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,
    },
    {
      path: 'vite.config.ts',
      content: `import { defineConfig } from 'vite';\nimport vue from '@vitejs/plugin-vue';\n\nexport default defineConfig({\n  plugins: [vue()],\n});\n`,
    },
    {
      path: 'src/main.ts',
      content: `import { createApp } from 'vue';\n${schema.styling === 'Tailwind CSS' ? "import './style.css';\n" : ''}import App from './App.vue';\n\ncreateApp(App).mount('#app');\n`,
    },
    {
      path: 'src/App.vue',
      content: `<template>
  <main${schema.styling === 'Tailwind CSS' ? ' class="flex min-h-screen flex-col items-center justify-center p-24"' : ''}>
    <h1${schema.styling === 'Tailwind CSS' ? ' class="text-4xl font-bold"' : ''}>Welcome to ${schema.name}</h1>
    <p>Scaffolded with Auto-Architect.</p>
  </main>
</template>
`,
    },
  ],
};

const TEMPLATES: Record<Framework, FrameworkTemplate> = {
  'Next.js': NEXT_TEMPLATE,
  'React (Vite)': REACT_VITE_TEMPLATE,
  'Vue (Vite)': VUE_VITE_TEMPLATE,
};

/** Extra packages implied by database / auth / feature selections. */
const INTEGRATION_DEPENDENCIES: Record<string, Record<string, string>> = {
  'Supabase (PostgreSQL)': { '@supabase/supabase-js': '^2.45.0' },
  Firebase: { firebase: '^10.12.0' },
  MongoDB: { mongodb: '^6.8.0' },
  PostgreSQL: { pg: '^8.12.0' },
  MySQL: { mysql2: '^3.11.0' },
  Prisma: { '@prisma/client': '^5.17.0' },
  'Stripe Billing': { stripe: '^16.6.0' },
  Clerk: { '@clerk/clerk-js': '^5.11.0' },
  'Auth.js': { 'next-auth': '^4.24.7' },
  Auth0: { 'auth0-js': '^9.27.0' },
};

function integrationsFor(schema: ArchitectureSchema): Record<string, string> {
  const selected = [schema.database, schema.auth, ...schema.features].filter(
    (value): value is string => Boolean(value),
  );
  return selected.reduce<Record<string, string>>((acc, key) => {
    return { ...acc, ...(INTEGRATION_DEPENDENCIES[key] ?? {}) };
  }, {});
}

function sortedRecord(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * Compute every file the project would contain. Pure: no disk writes,
 * which is what makes the generator testable and `--dry-run` possible.
 */
export function planProject(schema: ArchitectureSchema): ScaffoldPlan {
  const template = TEMPLATES[schema.framework];
  const useTailwind = schema.styling === 'Tailwind CSS' && template.tailwind !== undefined;

  const dependencies = sortedRecord({ ...template.dependencies, ...integrationsFor(schema) });
  const devDependencies = sortedRecord({
    ...template.devDependencies,
    ...(useTailwind
      ? { autoprefixer: '^10.4.19', postcss: '^8.4.40', tailwindcss: '^3.4.7' }
      : {}),
  });

  const files: GeneratedFile[] = [
    {
      path: 'package.json',
      content: JSON.stringify(
        {
          name: schema.name,
          version: '0.1.0',
          private: true,
          scripts: template.scripts,
          dependencies,
          devDependencies,
        },
        null,
        2,
      ),
    },
    {
      path: 'README.md',
      content: [
        `# ${schema.name}`,
        '',
        'Scaffolded by [Auto-Architect](https://github.com/shark0120/auto-architect).',
        '',
        '## Stack',
        `- **Framework**: ${schema.framework}`,
        `- **Styling**: ${schema.styling}`,
        `- **Database**: ${schema.database ?? 'None'}`,
        `- **Auth**: ${schema.auth ?? 'None'}`,
        `- **CI/CD**: ${schema.ci ?? 'None'}`,
        `- **Features**: ${schema.features.length > 0 ? schema.features.join(', ') : 'None'}`,
        '',
        '## Getting started',
        '',
        '```bash',
        'npm install',
        `npm run ${template.scripts['dev'] ? 'dev' : 'build'}`,
        '```',
        '',
      ].join('\n'),
    },
    {
      path: '.gitignore',
      content: ['node_modules/', 'dist/', '.next/', '.env', '.env.local', ''].join('\n'),
    },
    ...template.files(schema),
  ];

  if (useTailwind && template.tailwind) {
    files.push(
      {
        path: 'tailwind.config.js',
        content: `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ${JSON.stringify(template.tailwind.contentGlobs)},
  theme: { extend: {} },
  plugins: [],
};
`,
      },
      {
        path: 'postcss.config.js',
        content: `module.exports = {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n};\n`,
      },
      {
        path: template.tailwind.stylesheetPath,
        content: '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n',
      },
    );
  }

  if (schema.ci === 'GitHub Actions') {
    files.push({
      path: '.github/workflows/ci.yml',
      content: `name: CI

on:
  push:
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run build
`,
    });
  }

  return { files };
}

export interface ScaffoldOptions {
  /** Print the plan without touching the filesystem. */
  dryRun?: boolean;
}

export function scaffoldProject(
  schema: ArchitectureSchema,
  targetDir: string,
  options: ScaffoldOptions = {},
): ScaffoldPlan {
  const plan = planProject(schema);

  if (options.dryRun) {
    console.log(`\n${chalk.bold('Would create:')}`);
    for (const file of plan.files) {
      console.log(`  ${chalk.yellow('PLAN')} ${targetDir}/${file.path}`);
    }
    console.log(chalk.cyan(`\n${plan.files.length} files (dry run - nothing written).`));
    return plan;
  }

  console.log(`\n${chalk.bold('Building project files:')}`);
  for (const file of plan.files) {
    createFile(`${targetDir}/${file.path}`, file.content);
  }

  console.log(chalk.green(`\nGenerated ${schema.name} (${plan.files.length} files).`));
  console.log(chalk.cyan(`\nNext steps:\n  cd ${targetDir}\n  npm install\n  npm run dev`));
  return plan;
}
