/**
 * Prompt -> ArchitectureSchema.
 *
 * This is deterministic keyword/heuristic matching, not a language model.
 * It is fast and offline, but it only understands the vocabulary listed in the
 * rule tables below; anything else is surfaced via `unrecognized`.
 */

export type Framework = 'Next.js' | 'React (Vite)' | 'Vue (Vite)';

export interface ArchitectureSchema {
  name: string;
  framework: Framework;
  styling: string;
  features: string[];
  /** Prompt words we could not map to a known capability. */
  unrecognized: string[];
  database?: string;
  auth?: string;
  ci?: string;
}

export const DEFAULT_PROJECT_NAME = 'my-auto-app';
export const DEFAULT_FRAMEWORK: Framework = 'React (Vite)';
export const DEFAULT_STYLING = 'CSS Modules';

/** Ordered: the first match wins, so more specific patterns come first. */
const FRAMEWORK_RULES: ReadonlyArray<readonly [RegExp, Framework]> = [
  [/\bnext(?:\.js|js)?\b/i, 'Next.js'],
  [/\b(?:vue|nuxt)\b/i, 'Vue (Vite)'],
  [/\breact\b/i, 'React (Vite)'],
];

const DATABASE_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bsupabase\b/i, 'Supabase (PostgreSQL)'],
  [/\bfirebase\b/i, 'Firebase'],
  [/\bmongo(?:db)?\b/i, 'MongoDB'],
  [/\bpostgres(?:ql)?\b/i, 'PostgreSQL'],
  [/\bmysql\b/i, 'MySQL'],
  [/\bprisma\b/i, 'Prisma'],
];

const STYLING_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\btailwind\b/i, 'Tailwind CSS'],
  [/\b(?:styled[- ]components)\b/i, 'styled-components'],
  [/\b(?:material[- ]?ui|mui)\b/i, 'Material UI'],
];

const AUTH_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bclerk\b/i, 'Clerk'],
  [/\b(?:auth\.js|nextauth|next-auth)\b/i, 'Auth.js'],
  [/\bauth0\b/i, 'Auth0'],
];

const CI_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bgithub actions\b/i, 'GitHub Actions'],
  [/\bgitlab ci\b/i, 'GitLab CI'],
];

const FEATURE_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bstripe\b/i, 'Stripe Billing'],
  [/\bi18n|internationali[sz]ation\b/i, 'i18n'],
  [/\bdocker\b/i, 'Docker'],
];

/** Words that carry no architectural meaning; never reported as unrecognized. */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'app', 'application', 'built', 'building', 'for', 'from',
  'in', 'my', 'new', 'of', 'on', 'project', 'server', 'site', 'that', 'the',
  'to', 'using', 'want', 'web', 'website', 'with', 'plus', 'site', 'called',
  'named', 'i', 'need', 'please', 'create', 'make', 'generate', 'setup', 'set',
  'up', 'full', 'stack', 'fullstack', 'frontend', 'backend', 'billing', 'auth',
  'authentication', 'database', 'db', 'styling', 'ci', 'cd',
]);

function firstMatch<T>(prompt: string, rules: ReadonlyArray<readonly [RegExp, T]>): T | undefined {
  for (const [pattern, value] of rules) {
    if (pattern.test(prompt)) return value;
  }
  return undefined;
}

function allMatches<T>(prompt: string, rules: ReadonlyArray<readonly [RegExp, T]>): T[] {
  return rules.filter(([pattern]) => pattern.test(prompt)).map(([, value]) => value);
}

/** Turn free text into a safe npm package name. */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 214);
  return slug || DEFAULT_PROJECT_NAME;
}

/** Pick up `called foo` / `named foo` from the prompt. */
function detectName(prompt: string): string | undefined {
  const match = /\b(?:called|named)\s+["']?([a-z0-9][a-z0-9 _-]*)["']?/i.exec(prompt);
  const captured = match?.[1];
  return captured ? slugify(captured.trim()) : undefined;
}

/** Collect prompt words that matched no rule, so the CLI can warn about them. */
function detectUnrecognized(prompt: string, matchedPatterns: RegExp[]): string[] {
  const words = prompt.toLowerCase().match(/[a-z][a-z.@/-]*[a-z]|[a-z]/g) ?? [];
  const seen = new Set<string>();
  const unknown: string[] = [];
  for (const word of words) {
    if (STOP_WORDS.has(word) || seen.has(word)) continue;
    seen.add(word);
    if (matchedPatterns.some((pattern) => pattern.test(word))) continue;
    unknown.push(word);
  }
  return unknown;
}

export function parsePromptToSchema(prompt: string): ArchitectureSchema {
  const framework = firstMatch(prompt, FRAMEWORK_RULES) ?? DEFAULT_FRAMEWORK;
  const styling = firstMatch(prompt, STYLING_RULES) ?? DEFAULT_STYLING;
  const database = firstMatch(prompt, DATABASE_RULES);
  const auth = firstMatch(prompt, AUTH_RULES);
  const ci = firstMatch(prompt, CI_RULES);
  const features = allMatches(prompt, FEATURE_RULES);

  const allPatterns = [
    ...FRAMEWORK_RULES, ...DATABASE_RULES, ...STYLING_RULES,
    ...AUTH_RULES, ...CI_RULES, ...FEATURE_RULES,
  ].map(([pattern]) => pattern);

  // `exactOptionalPropertyTypes` is on, so only attach optional keys when set.
  const schema: ArchitectureSchema = {
    name: detectName(prompt) ?? DEFAULT_PROJECT_NAME,
    framework,
    styling,
    features,
    unrecognized: detectUnrecognized(prompt, allPatterns),
  };
  if (database) schema.database = database;
  if (auth) schema.auth = auth;
  if (ci) schema.ci = ci;

  return schema;
}
