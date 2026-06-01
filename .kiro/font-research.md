# Font Research

## Problem

Regular fonts (TrueType/OpenType) are **outlines** — closed shapes. When a plotter draws them,
it traces the contour, so "O" becomes two circles (outer + inner). We need **single-stroke** fonts
where each letter is a single open path, like handwriting with a pen.

## Available Solutions

### Hershey Fonts (Primary Choice)
- **Origin**: Created by Dr. Allen Hershey at Naval Weapons Laboratory, ~1967
- **License**: Public domain
- **Coverage**: Latin, Greek, **Cyrillic**, Japanese, symbols
- **Styles**: Simplex (thin), Duplex, Complex, Triplex; Script (cursive)
- **Format**: Coordinate pairs connected by straight lines
- **Key repos**:
  - https://github.com/kamalmostafa/hershey-fonts — C library + original data
  - https://github.com/reinholtz/hershey-fonts-with-unicode — Unicode mapping
  - https://github.com/techninja/hersheytextjs — npm package, JSON format
  - https://gitlab.com/oskay/svg-fonts — SVG font format (Evil Mad Scientist)

### Cyrillic-Specific
- https://github.com/zxfr/strokefont_cyrillic — Tools for converting fonts to single-stroke with Cyrillic support
- Hershey "cyrillic" font set — exists in original data, uses KOI7 encoding
- Need to map KOI7/cp1251 → Unicode for modern use

### Commercial Options (not used)
- Quantum Enterprises (quantumenterprises.co.uk) — £99-200 per font, no Cyrillic
- Custom font creation services — expensive, long turnaround

## Chosen Approach

1. Use `hersheytext` npm package as base — provides JSON font data + SVG font loading
2. The original Hershey font collection includes Cyrillic characters
3. Use `reinholtz/hershey-fonts-with-unicode` for proper Unicode mapping
4. Font styles to consider:
   - `hershey_script_1` — cursive/script style (most "handwritten" look)
   - `futural` (Hershey Sans Simplex) — clean single-stroke print
   - Cyrillic variants from the original Hershey data

## Font Data Format (in our app)

```json
{
  "name": "hershey-cyrillic",
  "unitsPerEm": 32,
  "glyphs": {
    "А": { "path": "M0,0 L8,21 L16,0 M3,7 L13,7", "width": 16 },
    "Б": { "path": "M2,0 L2,21 L12,21 ...", "width": 14 },
    ...
  }
}
```

Each glyph has:
- `path`: SVG path `d` attribute (M, L, C commands)
- `width`: advance width (horizontal space the character occupies)

## Fallback Strategy

If a character is not found in font data:
1. Show warning to user
2. Skip the character (leave blank space of average width)
3. Never crash the pipeline
