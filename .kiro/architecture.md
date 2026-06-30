# Architecture

## Components

```
src/
├── core/
│   ├── font.ts          — Font data loading & glyph lookup (172 glyphs)
│   ├── docx-parser.ts   — DOCX → Document Model (with style hierarchy resolution)
│   ├── layout.ts        — Document Model → Positioned Glyphs (baseline-aligned)
│   ├── effects.ts       — Apply handwriting randomness (seeded PRNG)
│   ├── gcode.ts         — SVG paths → G-code (GRBL format, Bézier flattening)
│   └── pipeline.ts      — Orchestrator: connects all modules
├── ui/
│   └── app.ts           — Web interface (drag-drop, preview, settings, download)
├── fonts/
│   └── slimamif.json    — Centerline-extracted font data (172 glyphs)
tests/
├── e2e.test.ts          — 27 visual regression tests (gcode → PNG snapshots)
├── line-spacing.test.ts — 7 tests for line spacing variants
├── char-spacing.test.ts — 5 tests for character spacing
├── style-defaults.test.ts — 4 tests for docDefaults/Normal style resolution
└── helpers/
    ├── gcode-to-png.ts  — Renders gcode to PNG (green/red dots for pen up/down)
    ├── create-docx.ts   — Test fixture: generates .docx in memory
    └── compare-images.ts — Pixel diff with 0.1% threshold
```

## Data Flow

```
┌─────────────┐
│  .docx file │
└──────┬──────┘
       │ JSZip unzip + DOMParser
       ▼
┌─────────────────────────────────────────┐
│ styles.xml → resolve defaults            │
│   docDefaults < Normal style < explicit  │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Document Model                           │
│ { pageSize, margins, paragraphs[] }     │
│   paragraph: { runs[], indent, tabs,    │
│     alignment, spacing }                │
│   run: { text, fontSize, charSpacing }  │
└──────┬──────────────────────────────────┘
       │ + Font Data (path + width per char)
       ▼
┌─────────────────────────────────────────┐
│ Positioned Glyphs                        │
│ Page[] → { char, x, y, scale, path }[] │
│ (baseline-aligned, word-wrapped)        │
└──────┬──────────────────────────────────┘
       │ Handwriting Effects (seeded PRNG)
       ▼
┌─────────────────────────────────────────┐
│ Transformed Glyphs                       │
│ (with random offsets/rotation)          │
└──────┬──────────────────────────────────┘
       │ SVG path parse + Bézier flatten
       ▼
┌─────────────────────────────────────────┐
│ G-code                                   │
│ Header: G21 G90 + G92 + pen config      │
│ Body: G00/G01 moves, pen up/down        │
│ Pages: M0 pause between pages           │
│ Footer: pen up + home + M05 + M30       │
└─────────────────────────────────────────┘
```

## Key Interfaces

```typescript
// Font
interface Glyph {
  path: string; // SVG path (M/L/C/Q commands)
  width: number; // advance width in font units
}

// Document Model
interface Document {
  pageSize: { width: number; height: number }; // mm
  margins: { top: number; bottom: number; left: number; right: number };
  paragraphs: Paragraph[];
}

interface Paragraph {
  runs: Run[];
  format: ParagraphFormat;
}

interface ParagraphFormat {
  indent: { left: number; right: number; firstLine: number };
  tabs: { pos: number }[];
  alignment: 'left' | 'center' | 'right' | 'justify';
  spacing: { before: number; after: number; line: number };
}

interface Run {
  text: string;
  fontSize: number; // pt
  charSpacing: number; // mm (negative = condensed, positive = expanded)
}

// Layout output
interface PositionedGlyph {
  char: string;
  x: number;
  y: number;
  scale: number;
  pathData: string;
}

interface Page {
  glyphs: PositionedGlyph[];
}

// G-code config
interface GcodeConfig {
  penUp: string; // e.g. "G00 Z0.300"
  penDown: string; // e.g. "G01 Z-0.200 F5000"
  feedRate: number; // mm/min for drawing
  travelRate: number; // mm/min for travel
  startCode: string; // header (includes G92 for home position)
  endCode: string; // footer
}
```

## Style Resolution (OOXML spec)

Paragraph spacing is resolved through the style hierarchy:

1. **docDefaults** (`styles.xml` → `<w:docDefaults>`) — document-wide base
2. **Normal style** (`styles.xml` → `<w:style w:default="1" w:type="paragraph">`) — overrides docDefaults
3. **Direct formatting** (`document.xml` → `<w:pPr>`) — overrides everything

Important: an explicit `w:after="0"` means "no spacing" and must NOT be
overridden by docDefaults. The parser tracks whether attributes were explicitly
set vs absent.

## Coordinate System

- Origin: top-left of page
- Units: millimeters
- X: left → right
- Y: top → bottom (SVG convention), inverted to bottom → top for G-code
- Font units → mm: `fontSize_pt * 0.3528 / unitsPerEm`
