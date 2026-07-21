# Contributing

Thanks for taking a look. This project is small and easy to extend.

## Setup

```bash
npm install
npm test
```

## Before opening a pull request

All four must pass — CI runs the same checks:

```bash
npm run typecheck   # tsc --noEmit, 0 errors
npm test            # vitest run
npm run build       # compiles to dist/
npm start -- generate "React app with Tailwind" --dir /tmp/smoke   # smoke test
```

If you touched a framework template, also verify the generated project builds:

```bash
cd /tmp/smoke && npm install && npm run build
```

That last check is the one that matters most — the whole point of this tool is
that its output actually works.

## Adding a keyword

Rules live in table form in `src/parser.ts`. Add an entry to the relevant rule
array and a test case in `src/parser.test.ts`:

```ts
const DATABASE_RULES = [
  // ...
  [/\bredis\b/i, 'Redis'],
] as const;
```

If the keyword implies an npm package, add it to `INTEGRATION_DEPENDENCIES` in
`src/generators/engine.ts`.

## Adding a framework

1. Add the name to the `Framework` union in `src/parser.ts` and a detection rule.
2. Add a `FrameworkTemplate` in `src/generators/engine.ts` with its dependencies,
   scripts and files, then register it in `TEMPLATES`.
3. Add tests to `src/generators/engine.test.ts` asserting the scripts and entry
   files — mirror the existing Vue cases.
4. Generate a project with the new framework and confirm `npm install && npm run build`
   succeeds.

## Conventions

- Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
- Keep `planProject` pure — it returns files, it does not write them. That is what
  makes the generator testable and `--dry-run` possible.
- Do not claim capabilities the code does not have. The README documents the parser
  as keyword matching on purpose.
