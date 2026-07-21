import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FRAMEWORK,
  DEFAULT_PROJECT_NAME,
  DEFAULT_STYLING,
  parsePromptToSchema,
  slugify,
} from './parser.js';

describe('framework detection', () => {
  it.each([
    ['Next.js app with Supabase', 'Next.js'],
    ['nextjs dashboard', 'Next.js'],
    ['a React app with Firebase', 'React (Vite)'],
    ['Vue storefront', 'Vue (Vite)'],
    ['nuxt blog', 'Vue (Vite)'],
  ])('parses %j as %s', (prompt, expected) => {
    expect(parsePromptToSchema(prompt).framework).toBe(expected);
  });

  it('falls back to the default framework when none is named', () => {
    // Regression: the original code set framework to the string 'Unknown',
    // so its `if (!framework)` fallback could never fire.
    expect(parsePromptToSchema('app with tailwind').framework).toBe(DEFAULT_FRAMEWORK);
  });

  it('prefers Next.js when both Next.js and React appear', () => {
    expect(parsePromptToSchema('Next.js React app').framework).toBe('Next.js');
  });
});

describe('database detection', () => {
  it.each([
    ['supabase', 'Supabase (PostgreSQL)'],
    ['firebase', 'Firebase'],
    ['mongodb', 'MongoDB'],
    ['postgresql', 'PostgreSQL'],
    ['prisma', 'Prisma'],
  ])('detects %s', (keyword, expected) => {
    expect(parsePromptToSchema(`React app with ${keyword}`).database).toBe(expected);
  });

  it('leaves database unset when none is mentioned', () => {
    expect(parsePromptToSchema('React app').database).toBeUndefined();
  });
});

describe('styling, auth, ci and features', () => {
  it('detects Tailwind', () => {
    expect(parsePromptToSchema('React with Tailwind').styling).toBe('Tailwind CSS');
  });

  it('defaults styling when none is mentioned', () => {
    expect(parsePromptToSchema('React app').styling).toBe(DEFAULT_STYLING);
  });

  it('detects auth providers', () => {
    expect(parsePromptToSchema('Next.js with Clerk').auth).toBe('Clerk');
  });

  it('detects GitHub Actions', () => {
    expect(parsePromptToSchema('React app with GitHub Actions').ci).toBe('GitHub Actions');
  });

  it('collects multiple features', () => {
    const schema = parsePromptToSchema('Next.js with Stripe and Docker');
    expect(schema.features).toEqual(expect.arrayContaining(['Stripe Billing', 'Docker']));
  });

  it('returns an empty feature list when none match', () => {
    expect(parsePromptToSchema('React app').features).toEqual([]);
  });
});

describe('project naming', () => {
  it('uses the default name when none is given', () => {
    expect(parsePromptToSchema('React app').name).toBe(DEFAULT_PROJECT_NAME);
  });

  it('picks up "called <name>"', () => {
    expect(parsePromptToSchema('React app called Shop Front').name).toBe('shop-front');
  });

  it('picks up "named <name>"', () => {
    expect(parsePromptToSchema('Vue app named blogzilla').name).toBe('blogzilla');
  });

  it('slugifies unsafe characters', () => {
    expect(slugify('My  Cool App!!')).toBe('my-cool-app');
  });

  it('falls back to the default for an empty slug', () => {
    expect(slugify('!!!')).toBe(DEFAULT_PROJECT_NAME);
  });
});

describe('unrecognised vocabulary', () => {
  it('reports words it cannot map', () => {
    const schema = parsePromptToSchema('React app with Svelte and Kubernetes');
    expect(schema.unrecognized).toEqual(expect.arrayContaining(['svelte', 'kubernetes']));
  });

  it('does not report recognised keywords or filler words', () => {
    const schema = parsePromptToSchema('a React app with Tailwind');
    expect(schema.unrecognized).not.toContain('react');
    expect(schema.unrecognized).not.toContain('tailwind');
    expect(schema.unrecognized).not.toContain('app');
  });
});
