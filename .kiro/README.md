# chornyla — Project Context

## What is this

Open-source client-side web app (TypeScript + Vite) that converts .docx documents
into G-code for pen plotters using single-stroke handwriting fonts.

**Repo:** https://github.com/Avariya/chornyla
**Live:** https://avariya.github.io/chornyla/
**License:** MIT © Oleksii Romanchenko

## Workflow

```
Word/LibreOffice → .docx → [Browser: parse + layout + effects] → .gcode → Plotter
```

The document in Word should use **Slimamif Light** font for accurate size matching
between Word preview and plotter output.

## Architecture (data flow)

```
.docx file
  ↓ JSZip + DOMParser
Document Model (page size, margins, orientation, paragraphs with formatting)
  ↓ + Font Data (SlimamifLight, centerline-extracted JSON, 172 glyphs)
Positioned Glyphs (char, x, y, scale, pathData) — baseline-aligned
  ↓ Handwriting Effects (seeded random offsets)
Transformed Glyphs
  ↓ SVG Path → G-code (line segments, pen up/down)
.gcode file (GRBL-compatible)
```

## Key decisions

1. **Client-side only** — entire pipeline in browser, no server needed
2. **Vite + vanilla TS** — minimal stack, no frameworks
3. **SlimamifLight** — handwritten OTF font, centerline-extracted for single-stroke
4. **DOCX as layout tool** — user sets margins/tabs/spacing in Word
5. **Configurable G-code** — presets for different plotter types (Z-axis, servo)
6. **GRBL-compatible output** — G00/G01 moves, M03/M05, M30
7. **Exact sizing** — glyph widths/heights match Word rendering precisely
8. **Visual regression tests** — 43 tests via Vitest + sharp (gcode → PNG snapshots)
9. **Single-file build** — dist/index.html is one self-contained file (~168KB)

## Testing

```bash
npm test                    # run tests (43 total)
UPDATE_SNAPSHOTS=1 npm test # update snapshots after intentional changes
```

Tests cover:

- Basic text, indents, tabs, alignment
- Mixed font sizes (baseline alignment)
- Cyrillic, Latin, special chars (guillemets, №, dash variants, ellipsis)
- Landscape/portrait A4/A3
- Line spacing (single/1.5/double/custom)
- Character spacing (condensed/expanded)
- Style defaults resolution (docDefaults vs Normal style vs explicit)
- Multi-page documents

## Target audience

Non-technical user who has a pen plotter and wants to print Cyrillic text
that looks hand-written.
