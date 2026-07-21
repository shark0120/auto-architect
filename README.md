# Auto-Architect

> Turn a plain-English stack description into a project skeleton that actually installs and builds.

[![CI](https://github.com/shark0120/auto-architect/actions/workflows/ci.yml/badge.svg)](https://github.com/shark0120/auto-architect/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

```bash
git clone https://github.com/shark0120/auto-architect.git
cd auto-architect
npm install
npm start -- generate "Next.js app with Supabase, Tailwind and GitHub Actions" --dir ./my-app
```

```
Resolved stack
  Framework : Next.js
  Styling   : Tailwind CSS
  Database  : Supabase (PostgreSQL)
  Auth      : None
  CI/CD     : GitHub Actions
  Features  : None

Building project files:
CREATE ./my-app/package.json
CREATE ./my-app/README.md
CREATE ./my-app/.gitignore
CREATE ./my-app/next.config.mjs
CREATE ./my-app/tsconfig.json
CREATE ./my-app/app/layout.tsx
CREATE ./my-app/app/page.tsx
CREATE ./my-app/tailwind.config.js
CREATE ./my-app/postcss.config.js
CREATE ./my-app/app/globals.css
CREATE ./my-app/.github/workflows/ci.yml
```

Then `cd my-app && npm install && npm run build` — it builds.

## Why this exists

Most scaffolding tools make you answer ten prompts or memorise a flag matrix.
Auto-Architect takes one sentence and writes a complete, **buildable** starter:
correct `package.json` scripts for the framework, real dependencies, a working
entry point, and optional Tailwind / CI wiring.

Every generated stack is verified end to end — `npm install && npm run build`
succeeds for Next.js, React (Vite) and Vue (Vite) output.

## How the parser works — no magic

**This is deterministic keyword matching, not a language model.** No API key, no
network call, no inference. It recognises a fixed vocabulary and tells you what
it ignored:

```bash
npm start -- generate "React app with Svelte and Kubernetes"
# Not recognised (ignored): svelte, kubernetes
```

That trade-off is deliberate: it runs offline in milliseconds and its behaviour
is fully covered by tests. If you want a term supported, add a rule to
`src/parser.ts` — it is a table, not a model.

### Recognised vocabulary

| Category | Keywords |
|---|---|
| Framework | `next.js` / `nextjs`, `react`, `vue` / `nuxt` |
| Database | `supabase`, `firebase`, `mongodb`, `postgresql`, `mysql`, `prisma` |
| Styling | `tailwind`, `styled-components`, `material ui` / `mui` |
| Auth | `clerk`, `auth.js` / `next-auth`, `auth0` |
| CI/CD | `github actions`, `gitlab ci` |
| Features | `stripe`, `i18n`, `docker` |
| Naming | `called <name>`, `named <name>` |

Unnamed framework defaults to React (Vite); unnamed styling defaults to CSS Modules.

## Usage

```bash
npm start -- generate "<description>" [--dir <path>] [--dry-run]
```

| Option | Description |
|---|---|
| `-d, --dir <path>` | Where to write the project (default `./my-auto-app`) |
| `--dry-run` | Print the file list without writing anything |

Built as a CLI binary (`auto-architect`) via `npm run build`; not published to
npm yet, so install from source for now.

## Development

```bash
npm install
npm test          # 42 unit tests
npm run typecheck # tsc --noEmit
npm run build     # compile to dist/
```

## Current limitations

Stated plainly, because they matter if you are evaluating this:

- Keyword matching only — no semantic understanding of novel phrasing.
- Three frameworks (Next.js, React+Vite, Vue+Vite). Svelte, Astro and backend-only
  stacks are not supported yet.
- Database/auth selections add the client package and document the choice; they do
  not generate connection code or schema.
- Not published to npm, so there is no `npx auto-architect` yet.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Adding a keyword or a framework template is
a good first change.

## License

MIT — see [LICENSE](LICENSE).
