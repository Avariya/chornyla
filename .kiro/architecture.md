# Architecture

## Components

```
src/
├── core/
│   ├── font.ts          — Font data loading & glyph lookup
│   ├── docx-parser.ts   — DOCX → Document Model
│   ├── layout.ts        — Document Model → Positioned Glyphs
│   ├── effects.ts       — Apply handwriting randomness
│   ├── gcode.ts         — SVG paths → G-code
│   └── pipeline.ts      — Orchestrator: connects all modules
├── ui/
│   └── app.ts           — Web interface
└── fonts/
    └── hershey-cyrillic.json — Font glyph data
```

## Data Flow

```
┌─────────────┐
│  .docx file │
└──────┬──────┘
       │ JSZip unzip + DOMParser
       ▼
┌─────────────────────────────────────┐
│ Document Model                       │
│ { pageSize, margins, paragraphs[] } │
│   paragraph: { text, indent, tabs,  │
│     alignment, spacing, fontSize }  │
└──────┬──────────────────────────────┘
       │ + Font Data (path + width per char)
       ▼
┌─────────────────────────────────────┐
│ Positioned Glyphs                    │
│ Page[] → { char, x, y, scale,      │
│            pathData }[]             │
└──────┬──────────────────────────────┘
       │ Handwriting Effects (seeded PRNG)
       ▼
┌─────────────────────────────────────┐
│ Transformed Glyphs                   │
│ (with random offsets/rotation)      │
└──────┬──────────────────────────────┘
       │ SVG path parse + Bezier flatten
       ▼
┌─────────────────────────────────────┐
│ G-code                               │
│ G21 G90 G40 G17, M03, G04 P2        │
│ G00/G01 moves, pen up/down           │
│ M0 between pages, M05+M30 footer    │
└─────────────────────────────────────┘
```

## Key Interfaces

```typescript
// Font
interface Glyph { path: string; width: number; }

// Document Model
interface Document {
  pageSize: { width: number; height: number }; // mm
  margins: { top: number; bottom: number; left: number; right: number };
  paragraphs: Paragraph[];
}
interface Paragraph {
  runs: Run[];
  indent: { left: number; right: number; firstLine: number };
  tabs: number[];
  alignment: 'left' | 'center' | 'right' | 'justify';
  spacing: { before: number; after: number; line: number };
}
interface Run { text: string; fontSize: number; }

// Layout output
interface PositionedGlyph {
  char: string; x: number; y: number;
  scale: number; pathData: string;
}
interface Page { glyphs: PositionedGlyph[]; }

// G-code config
interface GcodeConfig {
  penUp: string;      // e.g. "G00 Z0.300"
  penDown: string;    // e.g. "G01 Z-0.200 F5000"
  feedRate: number;   // mm/min
  travelRate: number;
  pageHeight: number; // for Y-axis inversion (mm)
}
```

## Coordinate System

- Origin: top-left of page
- Units: millimeters
- X: left → right
- Y: top → bottom (SVG convention), inverted to bottom → top for G-code
- Font units → mm conversion based on fontSize (pt)
