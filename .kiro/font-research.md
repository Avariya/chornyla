# Font Research

## Problem

Regular fonts (TrueType/OpenType) are **outlines** — closed shapes. When a plotter draws them,
it traces the contour, so "O" becomes two circles (outer + inner). We need **single-stroke** fonts
where each letter is a single open path, like handwriting with a pen.

## Current Solution: SlimamifLight (centerline extraction)

### Source Font

- **File**: `SlimamifLight.otf` (must be installed on system for Word preview)
- **Style**: Handwritten/calligraphic
- **Coverage**: Full Ukrainian + Russian + Latin + digits + punctuation (172 glyphs)
- **License**: Free for personal and commercial use (Dmitri Zdorov, dimka.com)

### Extraction Process

1. Render each glyph at 200px using PIL (preserving baseline-relative positioning)
2. Binary threshold (< 128)
3. For dot-characters (і, ї, й, i, j, ё, Ї, Ё): separate small connected components as dots
4. Skeletonize body using `skimage.morphology.skeletonize`
5. Trace skeleton with greedy algorithm that follows straightest path through junctions
6. Merge nearby segments (threshold 15px)
7. Douglas-Peucker simplification (tolerance 1.2px)
8. Convert pixel coords to font units (px_to_units = unitsPerEm / renderSize)
9. Add dot paths as diamond shapes (radius 15 font units)

### Script Location

- `scripts/font-extract/` — Python extraction scripts
- Dependencies: `fonttools`, `scikit-image`, `PIL`, `numpy`
- Run: `python3 scripts/font-extract/extract_centerline.py`

### Manual Fixes Applied

- `а` — replaced with scaled-down `А` (original had too many fragments)
- `з` — merged 3 segments into 1 continuous stroke

### Font Metrics (SlimamifLight)

| Metric         | Value | Notes                                     |
| -------------- | ----- | ----------------------------------------- |
| unitsPerEm     | 1000  | Standard                                  |
| sCapHeight     | 700   | OS/2 table, verified                      |
| sxHeight       | 500   | OS/2 table                                |
| sTypoAscender  | 800   |                                           |
| sTypoDescender | -200  |                                           |
| usWinAscent    | 1139  | Used for line height                      |
| usWinDescent   | 264   | Used for line height                      |
| FONT_BASELINE  | 1140  | Y coord of baseline in our extracted data |

### Line Height Formula

Word single-spacing = `(usWinAscent + usWinDescent) / unitsPerEm * fontSize_mm`
= `1403 / 1000 * fontSize * 0.3528` = `fontSize * 0.3528 * 1.403`

### Font Scale Formula

`scale = fontSize_pt * 0.3528 / unitsPerEm`
= `fontSize * 0.3528 / 1000`

## Font Data Format (in our app)

```json
{
  "name": "slimamif-light",
  "unitsPerEm": 1000,
  "glyphs": {
    "А": { "path": "M440,1140 L...", "width": 495.0 },
    "а": { "path": "M...", "width": 353.6 },
    ...
  }
}
```

- `path`: SVG path with M, L, C, Q commands (lines + Bézier curves)
- `width`: advance width in font units (matches OTF hmtx table)
- Coordinates: Y=0 is top, Y grows downward, baseline at ~1140

## Previous Approach (deprecated)

### Hershey Fonts

- Used initially, replaced due to "too printed" look
- Files: `src/data/slimamif.json` (no longer imported from hershey-raw.json)
- Issues: not handwritten enough, complex mapping for Cyrillic

## Segment Count Goals

- Ideal: 1-2 segments per glyph (one continuous stroke)
- Acceptable: 3-4 (crossbars, dots)
- Current: ~310 total segments for 172 glyphs (avg ~1.8)
- Only `#` has > 4 segments (5)
