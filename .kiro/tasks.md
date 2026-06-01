# Tasks

## Task 0: Project Scaffolding ✅
- Vite + TypeScript project initialized
- README.md with Windows install instructions
- .kiro/ context directory created
- Folder structure: src/core/, src/ui/, src/fonts/

## Task 1: Font Data Integration ✅
- Module: `src/core/font.ts`
- Integrate Hershey font data with Cyrillic (ukr + rus + latin)
- API: `getGlyph(char) → { path, width } | null`
- Source: hersheytext npm + hershey-fonts-with-unicode
- Test: every Ukrainian letter returns non-empty path

## Task 2: DOCX Parser ✅
- Module: `src/core/docx-parser.ts`
- JSZip to unzip .docx in browser
- Parse word/document.xml with DOMParser
- Extract: page size, margins, paragraph formatting (indent, tabs, alignment, spacing), font size, text
- Output: typed Document model

## Task 3: Text Layout Engine ✅
- Module: `src/core/layout.ts`
- Input: Document model + font data
- Word-wrap respecting margins + indents
- Tab stop handling
- Alignment: left, center, right, justify
- Line spacing
- Page breaks
- Output: Page[] with positioned glyphs

## Task 4: SVG Path to G-code Converter ✅
- Module: `src/core/gcode.ts`
- Parse SVG path commands (M, L, C, Q, Z)
- Adaptive Bezier curve flattening (~0.1mm tolerance)
- Coordinate transform (scale + translate per glyph)
- Configurable pen up/down commands
- G-code header/footer
- Path optimization (minimize pen-up travel)

## Task 5: Handwriting Effects ✅
- Module: `src/core/effects.ts`
- Seeded PRNG for reproducibility
- Per-glyph: X/Y offset (±0.2mm), rotation (±2°), scale (±3%)
- Baseline wobble
- Configurable intensity (0..1)

## Task 6: Full Pipeline Integration ✅
- Module: `src/core/pipeline.ts`
- `convert(docxFile, config) → gcode string`
- Multi-page support (M0 between pages)
- Error handling (unknown chars → warnings)

## Task 7: Web UI ✅
- Drag & drop .docx upload
- SVG preview of text on page
- Settings panel: plotter preset, feed rate, effects intensity
- Download G-code button
- Warnings display

## Task 8: Polish & Deployment ✅
- G-code presets: "GRBL Z-axis", "GRBL Servo", "Custom" (editable pen commands)
- localStorage for settings persistence
- Production build → static files (137KB / 43KB gzipped)
- dist/ folder can be served anywhere or opened directly

## Task 9: G-code Format Fix (plotter compatibility) ✅
- Fixed pen up/down Z values: Z0.300 up, Z-0.200 down (was Z5/Z0 — too high)
- G-code header: `G21 G90 G40 G17` + `M03 S10000` + `G04 P2`
- G-code footer: pen up + `G00 X0.000 Y0.000` + `M05` + `M30`
- Command format: G00/G01 (two-digit) instead of G0/G1
- Coordinate precision: 4 decimal places (was 2)
- Feed rate default: 5000 mm/min (was 3000)
- Pen down uses G01 with feed rate (controlled descent, not rapid)
- Fixed test helper `gcode-to-png.ts` to recognize new command format
- Added non-blank image assertion to prevent white-page test passes

## Task 10: Landscape Orientation Fix ✅
- `docx-parser.ts`: added `w:orient="landscape"` attribute handling
- When orient=landscape and height > width, swap dimensions
- Fixes A4/A3 landscape page sizes in generated output
