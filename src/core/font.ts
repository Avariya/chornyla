import fontData from '../fonts/slimamif.json';

export interface Glyph {
  path: string;
  width: number;
}

const glyphs = (fontData as any).glyphs as Record<string, { path: string; width: number }>;

let _italic = false;
export function setItalic(v: boolean) { _italic = v; }

function skewPath(d: string, angleDeg: number): string {
  const tan = Math.tan((angleDeg * Math.PI) / 180);
  const baseline = FONT_CAP_HEIGHT;
  const re = /-?\d+\.?\d*/g;
  let idx = 0;
  return d.replace(re, (match) => {
    const val = parseFloat(match);
    const isY = idx % 2 === 1;
    idx++;
    if (!isY) return match;
    // Skew X based on Y position (done on X, but we iterate X,Y pairs)
    return match;
  }).replace(re, (() => {
    let i = 0;
    return (match: string) => {
      const val = parseFloat(match);
      const isX = i % 2 === 0;
      i++;
      if (isX) {
        // Need next Y — approximate with baseline shift
        return match;
      }
      return match;
    };
  })());
}

// Proper italic skew: shift X based on Y
function applyItalic(d: string): string {
  const tan = Math.tan((12 * Math.PI) / 180);
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
    nums[i] = Math.round((nums[i] + (FONT_CAP_HEIGHT - nums[i + 1]) * tan) * 10) / 10;
  }
  let result = '';
  let ni = 0;
  for (let i = 0; i < parts.length; i++) {
    result += i % 2 === 0 ? parts[i] : String(nums[ni++]);
  }
  return result;
}

export function getGlyph(char: string): Glyph | null {
  const g = glyphs[char];
  if (!g) return null;

  if (_italic && g.path) {
    return { path: applyItalic(g.path), width: g.width };
  }
  return { path: g.path, width: g.width };
}

// Font metrics (SlimamifLight: unitsPerEm=1000, cap height ~700)
export const FONT_UNITS_PER_EM = 1000;
export const FONT_CAP_HEIGHT = 700;
export const FONT_BASELINE = 1140; // Y coordinate of baseline in font units
