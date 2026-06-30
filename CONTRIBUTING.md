# Contributing

Thanks for your interest in improving this project! Contributions are welcome.

## Development setup

Requirements: [Node.js](https://nodejs.org/) 20+ (LTS).

```bash
npm install      # install dependencies
npm run dev      # start dev server at http://localhost:5173
```

## Useful scripts

| Script                | Purpose                                        |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Dev server with hot reload                     |
| `npm run build`       | Production build (single-file HTML in `dist/`) |
| `npm run typecheck`   | TypeScript type checking                       |
| `npm run lint`        | ESLint                                         |
| `npm run format`      | Format with Prettier                           |
| `npm test`            | Run the test suite                             |
| `npm run test:update` | Regenerate visual-regression snapshots         |

## Before opening a pull request

Please make sure the following all pass locally (this is what CI runs):

```bash
npm run typecheck
npm run lint
npm run format:check
npm run build
npm test
```

## Working with the font

Glyphs live in `src/fonts/slimamif.json` as single-stroke SVG paths in font
units (Y grows downward, baseline at ~1140). When you change glyphs, regenerate
the visual snapshots with `npm run test:update` and review the diffs in
`tests/output/` before committing.

## Commit / PR guidelines

- Keep PRs focused on a single change.
- Describe what changed and how you verified it.
- Reference any related issue.
