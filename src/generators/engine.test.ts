import { describe, expect, it } from 'vitest';
import { parsePromptToSchema } from '../parser.js';
import { planProject } from './engine.js';

function planFor(prompt: string) {
  const plan = planProject(parsePromptToSchema(prompt));
  const byPath = new Map(plan.files.map((file) => [file.path, file.content]));
  return { plan, byPath, paths: [...byPath.keys()] };
}

function packageJsonOf(prompt: string) {
  const { byPath } = planFor(prompt);
  const raw = byPath.get('package.json');
  if (!raw) throw new Error('package.json was not generated');
  return JSON.parse(raw) as {
    name: string;
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
}

describe('generated package.json scripts', () => {
  it('uses next scripts for Next.js', () => {
    expect(packageJsonOf('Next.js app').scripts).toMatchObject({
      dev: 'next dev',
      build: 'next build',
    });
  });

  // Regression: every framework previously received hardcoded `next` scripts,
  // so React and Vue output could never run.
  it('uses vite scripts for React (Vite)', () => {
    const scripts = packageJsonOf('React app').scripts;
    expect(scripts).toMatchObject({ dev: 'vite', build: 'vite build' });
    expect(JSON.stringify(scripts)).not.toContain('next');
  });

  it('uses vite scripts for Vue (Vite)', () => {
    const scripts = packageJsonOf('Vue app').scripts;
    expect(scripts).toMatchObject({ dev: 'vite', build: 'vite build' });
    expect(JSON.stringify(scripts)).not.toContain('next');
  });
});

describe('generated dependencies', () => {
  it('gives Next.js projects the next runtime', () => {
    const pkg = packageJsonOf('Next.js app');
    expect(pkg.dependencies).toHaveProperty('next');
    expect(pkg.dependencies).toHaveProperty('react');
  });

  it('gives React (Vite) projects vite, not next', () => {
    const pkg = packageJsonOf('React app');
    expect(pkg.devDependencies).toHaveProperty('vite');
    expect(pkg.dependencies).not.toHaveProperty('next');
  });

  it('gives Vue projects the vue runtime and vue plugin', () => {
    const pkg = packageJsonOf('Vue app');
    expect(pkg.dependencies).toHaveProperty('vue');
    expect(pkg.devDependencies).toHaveProperty('@vitejs/plugin-vue');
  });

  it('adds integration packages for the detected database', () => {
    expect(packageJsonOf('Next.js with Supabase').dependencies).toHaveProperty(
      '@supabase/supabase-js',
    );
  });

  it('adds stripe when billing is requested', () => {
    expect(packageJsonOf('Next.js with Stripe').dependencies).toHaveProperty('stripe');
  });

  it('adds tailwind toolchain only when Tailwind is selected', () => {
    expect(packageJsonOf('React with Tailwind').devDependencies).toHaveProperty('tailwindcss');
    expect(packageJsonOf('React app').devDependencies).not.toHaveProperty('tailwindcss');
  });
});

describe('generated file set', () => {
  it('creates a runnable entry point per framework', () => {
    expect(planFor('Next.js app').paths).toEqual(
      expect.arrayContaining(['app/page.tsx', 'app/layout.tsx', 'next.config.mjs']),
    );
    expect(planFor('React app').paths).toEqual(
      expect.arrayContaining(['index.html', 'src/main.tsx', 'src/App.tsx', 'vite.config.ts']),
    );
    expect(planFor('Vue app').paths).toEqual(
      expect.arrayContaining(['index.html', 'src/main.ts', 'src/App.vue', 'vite.config.ts']),
    );
  });

  it('always includes package.json, README and .gitignore', () => {
    expect(planFor('React app').paths).toEqual(
      expect.arrayContaining(['package.json', 'README.md', '.gitignore']),
    );
  });

  it('writes tailwind config and stylesheet only when Tailwind is selected', () => {
    const withTailwind = planFor('React with Tailwind').paths;
    expect(withTailwind).toEqual(
      expect.arrayContaining(['tailwind.config.js', 'postcss.config.js', 'src/index.css']),
    );
    expect(planFor('React app').paths).not.toContain('tailwind.config.js');
  });

  it('imports the tailwind stylesheet from the entry file', () => {
    const { byPath } = planFor('React with Tailwind');
    expect(byPath.get('src/main.tsx')).toContain("import './index.css'");
  });

  it('adds a CI workflow only when requested', () => {
    expect(planFor('React app with GitHub Actions').paths).toContain('.github/workflows/ci.yml');
    expect(planFor('React app').paths).not.toContain('.github/workflows/ci.yml');
  });

  it('names the project from the prompt', () => {
    expect(packageJsonOf('React app called shop front').name).toBe('shop-front');
  });

  it('produces valid JSON for every generated .json file', () => {
    for (const file of planFor('Next.js with Supabase and Tailwind').plan.files) {
      if (file.path.endsWith('.json')) {
        expect(() => JSON.parse(file.content)).not.toThrow();
      }
    }
  });
});
