# Requirements

## Functional Requirements

### Input

- Format: .docx (Microsoft Word / LibreOffice Writer)
- Parsed formatting:
  - Page size (width, height) + orientation (landscape/portrait)
  - Margins (top, bottom, left, right)
  - Paragraph indent: left, right, firstLine, hanging
  - Tab stops (custom positions)
  - Alignment: left, center, right, justify
  - Line spacing: single, 1.5, double, exact value, custom multiplier
  - Font size (for glyph scaling)
  - Character spacing: condensed / expanded (twips → mm)
  - Style defaults resolution: docDefaults → Normal style → direct formatting
  - Text (Unicode: Ukrainian + Russian Cyrillic, Latin, digits, punctuation)

### Font

- Type: single-stroke — each letter drawn in one pen pass
- Style: handwritten
- Coverage (172 glyphs):
  - Ukrainian: А-Яа-я + Ґ, Є, І, Ї, ґ, є, і, ї
  - Russian: А-Яа-я + Ё, ё
  - Latin: A-Za-z
  - Digits: 0-9
  - Punctuation: . , ! ? : ; – — … " " « » ' ' ( ) / + = @ # № % ° ′ ″
- Special handling:
  - ы, № — kept upright in italic (curves distort)
  - Guillemets «» rendered as distinct glyphs

### "Living handwriting" effects

- Random X/Y offset (±0.2-0.3mm)
- Random character tilt (±2-3°)
- Size variation (±3-5%)
- Configurable intensity (0 = off, 1 = maximum)
- Seeded PRNG for reproducibility

### Output

- Format: .gcode (text file)
- Multi-page support (M0 pause between pages)
- G-code format (GRBL-compatible):
  - Header: `G21 G90 G40 G17` + pen config + `G92` home position
  - Footer: pen up + return to home + `M05` + `M30`
  - Coordinates: 4 decimal places (X47.8708 Y58.4835)
  - Move commands: G00 (rapid/travel), G01 (draw)
- Configurable pen up/down:
  - Z-axis: G00 Z0.300 / G01 Z-0.200 F5000 (default)
  - Servo: M3 S0 / M3 S50
  - Custom: arbitrary commands
- Feed rate: 5000 mm/min (default, configurable)
- Home position parsed from G92 in start code

### Interface

- Web app, runs in browser
- Drag & drop or file input for .docx
- SVG preview of text on "page"
- Settings panel (preset, feed rate, effects intensity)
- Download .gcode button
- Warnings for unknown characters
- Accessible to non-programmers

## Non-Functional Requirements

- Fully client-side (no server required)
- Deployable as a static site (GitHub Pages)
- Single-file HTML build (~168KB)
- Works offline after loading
- Conversion time: < 2 seconds for typical document
- Bundle size: minimal (no heavy frameworks)
- Node.js ≥ 26 for development
- CI: typecheck + lint + format + build + test on every push
- Visual regression tests with 0.1% pixel diff threshold
