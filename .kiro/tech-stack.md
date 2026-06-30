# Tech Stack

## Core

| Technology | Version | Purpose                           |
| ---------- | ------- | --------------------------------- |
| TypeScript | 5.7     | Type safety, IDE support          |
| Vite       | 6.x     | Build tool, dev server, HMR       |
| JSZip      | 3.10    | Unzip .docx files in browser      |
| Vitest     | 3.2     | Test runner (visual regression)   |
| sharp      | —       | PNG generation for test snapshots |

## Why This Stack

### TypeScript + Vite (not Python, not Electron)

- **Runs in browser** — no server needed, can be hosted as static site
- **Cross-platform** — works on any OS with a browser
- **Easy deployment** — `npm run build` → static files, or GitHub Pages
- **For Windows users** — only need Node.js installed, `npm run dev` and done
- **Vite** — fast dev server, instant HMR, tiny production builds

### Why not Electron/Tauri?

- Overkill for this use case — we don't need filesystem access or native APIs
- Electron adds ~150MB to app size
- Tauri requires Rust toolchain for building
- A localhost web app achieves the same UX with zero overhead

### JSZip (not mammoth, not docx2js)

- .docx is a ZIP with XML inside
- We need low-level access to paragraph formatting (indents, tabs, alignment)
- Libraries like `mammoth` convert to HTML and lose formatting details
- Direct XML parsing gives us full control over what we extract

## Font Data

| Source            | Format                    | Notes                            |
| ----------------- | ------------------------- | -------------------------------- |
| SlimamifLight.otf | Centerline-extracted JSON | Handwritten style, full Cyrillic |

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
- **Word-wrap** — respects page width, margins, indents
- **Baseline alignment** — mixed font sizes align by baseline, not top
