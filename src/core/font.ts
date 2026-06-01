import rawData from '../fonts/hershey-raw.json';
import { simplifyToSingleStroke } from './font-simplify';

export interface Glyph {
  path: string;
  width: number;
}

// Hershey font data: each glyph has { d: SVG path, w: half-width }
// Index = charCode - 33 (ASCII 33='!' maps to index 0)
const futural = (rawData as any).futural as { d: string; w: number }[];
const cyrillic = (rawData as any).cyrillic as { d: string; w: number }[];

// Pre-simplify cyrillic glyphs to single-stroke at load time
const cyrillicSimplified = cyrillic.map(g => ({
  d: g.d ? simplifyToSingleStroke(g.d) : g.d,
  w: g.w,
}));

// Verified mapping from visual inspection of Hershey Cyrillic font glyphs
const cyrToIndex: Record<string, number> = {
  // Uppercase
  'А': 32, 'Б': 33, 'Э': 34, 'Д': 35, 'И': 36, 'Ф': 37, 'Г': 38,
  'Ж': 39, 'Й': 40, 'Ч': 41, 'К': 42, 'Л': 43, 'М': 44, 'Н': 45,
  'О': 46, 'П': 47, 'Ш': 48, 'Р': 49, 'С': 50, 'Т': 51, 'Ю': 52,
  'В': 53, 'Щ': 54, 'Х': 55, 'У': 56, 'З': 57, 'Е': 58, 'Ъ': 60,
  'Я': 61, 'Ь': 62, 'Ц': 63,
  // Lowercase
  'а': 64, 'б': 65, 'э': 66, 'д': 67, 'й': 68, 'ф': 69, 'г': 70,
  'ж': 71, 'и': 72, 'ч': 73, 'к': 74, 'л': 75, 'м': 76, 'н': 77,
  'о': 78, 'п': 79, 'ш': 80, 'р': 81, 'с': 82, 'т': 83, 'ю': 84,
  'в': 85, 'щ': 86, 'х': 87, 'у': 88, 'з': 89, 'е': 90, 'ъ': 91,
  'я': 92, 'ь': 93,
};

// Custom Ukrainian glyphs (same coordinate system: uppercase y=1..22, lowercase y=8..22)
// Hershey Cyrillic uses DOUBLE-STROKE style (two parallel lines for each stroke)
// Width is FULL advance width (not half), returned directly without *2
const customGlyphs: Record<string, Glyph> = {
  // а — classic single-stroke: vertical line + oval (same as Latin a from futural)
  'а': { path: 'M15,8 L15,22 M15,11 L13,9 11,8 8,8 6,9 4,11 3,14 3,16 4,19 6,21 8,22 11,22 13,21 15,19', width: 20 },
  // ц — two verticals + bottom bar + descender tail
  'ц': { path: 'M3,8 L3,22 M14,8 L14,22 M0,8 L6,8 M11,8 L17,8 M0,22 L17,22 L18,25 L19,26', width: 20 },
  // І — single vertical + top/bottom serifs
  'І': { path: 'M5,1 L5,22 M2,1 L8,1 M2,22 L8,22', width: 10 },
  // і — single vertical + dot above
  'і': { path: 'M5,8 L5,22 M2,22 L8,22 M5,2 L4,3 5,4 6,3 5,2', width: 10 },
  // Ї — single vertical + serifs + two dots above
  'Ї': { path: 'M5,1 L5,22 M2,1 L8,1 M2,22 L8,22 M2,-3 L1,-2 2,-1 3,-2 2,-3 M8,-3 L7,-2 8,-1 9,-2 8,-3', width: 10 },
  // ї — single vertical + two dots above
  'ї': { path: 'M5,8 L5,22 M2,22 L8,22 M2,2 L1,3 2,4 3,3 2,2 M8,2 L7,3 8,4 9,3 8,2', width: 10 },
  // Є — C-shape + middle bar (single stroke)
  'Є': { path: 'M17,4 L15,2 12,1 10,1 7,2 5,4 4,6 3,9 3,14 4,17 5,19 7,21 10,22 12,22 15,21 17,19 M3,11 L12,11', width: 20 },
  // є — c-shape + middle bar (single stroke)
  'є': { path: 'M14,10 L12,8 9,8 7,9 5,11 4,14 4,16 5,19 7,21 9,22 12,22 14,20 M4,15 L11,15', width: 18 },
  // Ґ — vertical + top bar with upturn hook (single stroke)
  'Ґ': { path: 'M5,1 L5,22 M2,1 L15,1 15,-2 16,-3 M2,22 L8,22', width: 18 },
  // ґ — vertical + top bar with upturn hook (single stroke)
  'ґ': { path: 'M5,8 L5,22 M2,8 L13,8 13,5 14,4 M2,22 L8,22', width: 16 },
};

// Ukrainian-specific letters mapped to closest Cyrillic equivalents in Hershey
const ukrFallback: Record<string, string> = {
  'Ё': 'Е', 'ё': 'е',
};

let _italic = false;
export function setItalic(v: boolean) { _italic = v; }

function skewPath(d: string, angleDeg: number): string {
  const tan = Math.tan((angleDeg * Math.PI) / 180);
  const baseline = 22;
  const nums: number[] = [];
  const parts: string[] = [];
  let lastIdx = 0;
  const re = /-?\d+\.?\d*/g;
  let m;
  while ((m = re.exec(d)) !== null) {
    parts.push(d.slice(lastIdx, m.index));
    nums.push(parseFloat(m[0]));
    parts.push('');
    lastIdx = m.index + m[0].length;
  }
  parts.push(d.slice(lastIdx));
  for (let i = 0; i < nums.length - 1; i += 2) {
    nums[i] = Math.round((nums[i] + (baseline - nums[i + 1]) * tan) * 10) / 10;
  }
  let result = '';
  let ni = 0;
  for (let i = 0; i < parts.length; i++) {
    result += i % 2 === 0 ? parts[i] : String(nums[ni++]);
  }
  return result;
}

function getGlyphFromFont(
  font: { d: string; w: number }[],
  index: number
): Glyph | null {
  if (index < 0 || index >= font.length) return null;
  const g = font[index];
  if (!g || !g.d) return null;
  return { path: g.d, width: g.w * 2 };
}

export function getGlyph(char: string): Glyph | null {
  let result: Glyph | null = null;

  // Custom Ukrainian glyphs
  if (char in customGlyphs) result = customGlyphs[char];

  // Check Cyrillic mapping first
  if (!result) {
    const cyrIdx = cyrToIndex[char];
    if (cyrIdx !== undefined) result = getGlyphFromFont(cyrillicSimplified, cyrIdx);
  }

  // Ukrainian fallback
  if (!result) {
    const fallback = ukrFallback[char];
    if (fallback) return getGlyph(fallback);
  }

  // Latin/digits/punctuation from futural font (ASCII 33-127)
  if (!result) {
    const code = char.charCodeAt(0);
    if (code >= 33 && code <= 126) result = getGlyphFromFont(futural, code - 33);
  }

  // Space
  if (!result && char === ' ') result = { path: '', width: 16 };

  if (_italic && result && result.path) {
    return { path: skewPath(result.path, 12), width: result.width };
  }
  return result;
}

// Font metrics (in Hershey units, baseline at y=0, cap height ~21)
export const FONT_UNITS_PER_EM = 32;
export const FONT_CAP_HEIGHT = 21;
export const FONT_BASELINE = 9; // descenders go to ~9 below baseline
