# Tech Stack

## Core

| Technology             | Version | Purpose                           |
| ---------------------- | ------- | --------------------------------- |
| Node.js                | ≥26     | Runtime (engines field enforced)  |
| TypeScript             | 6.0     | Type safety, ES2024 target        |
| Vite                   | 7.3     | Build tool, dev server, HMR       |
| vite-plugin-singlefile | 2.3     | Inline JS/CSS into single HTML    |
| JSZip                  | 3.10    | Unzip .docx files in browser      |
| Vitest                 | 4.1     | Test runner (visual regression)   |
| sharp                  | 0.35    | PNG generation for test snapshots |
| jsdom                  | 29.x    | DOM environment for tests         |
| ESLint                 | 10.x    | Linting (flat config)             |
| typescript-eslint      | 8.62    | TS-aware lint rules               |
| Prettier               | 3.9     | Code formatting                   |

## Why This Stack

### TypeScript + Vite (not Python, not Electron)

- **Runs in browser** — no server needed, hostable as static site
- **Cross-platform** — works on any OS with a browser
- **Vite** — fast dev server, instant HMR, tiny production builds
- **Single-file output** — entire app in one HTML (~168KB)

### Why not Electron/Tauri?

- Overkill — we don't need filesystem access or native APIs
- A localhost web app achieves the same UX with zero overhead

### JSZip (not mammoth, not docx2js)

- .docx is a ZIP with XML inside
- We need low-level access to paragraph formatting
- Direct XML parsing gives us full control

## Build & CI

| Tool             | Purpose                                       |
| ---------------- | --------------------------------------------- |
| GitHub Actions   | CI (typecheck/lint/format/build/test), deploy |
| GitHub Pages     | Hosting (auto-deploy from main)               |
| Release workflow | Tag v* → builds HTML → attaches to Release    |

## Font Data

| Source            | Format                    | Notes                   |
| ----------------- | ------------------------- | ----------------------- |
| SlimamifLight.otf | Centerline-extracted JSON | Handwritten, 172 glyphs |

### Font Extraction Tools (dev-only, Python)

| Tool         | Purpose                                       |
| ------------ | --------------------------------------------- |
| fonttools    | Read OTF metrics (advance widths, cap height) |
| scikit-image | Skeletonization for centerline extraction     |
| Pillow (PIL) | Glyph rendering for skeleton input            |
| numpy        | Image array operations                        |

## Key Algorithms

- **Centerline extraction** — skeletonize + greedy junction tracing + Douglas-Peucker simplify
- **Seeded PRNG** — reproducible randomness for handwriting effects
- **Word-wrap** — respects page width, margins, indents, character spacing
- **Baseline alignment** — mixed font sizes align by baseline
- **Style hierarchy** — docDefaults < Normal style < direct formatting (per OOXML spec)
- **Bézier flattening** — SVG cubic/quadratic curves → line segments for G-code
