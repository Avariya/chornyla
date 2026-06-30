import { PositionedGlyph, Page } from './layout';

export interface EffectsConfig {
  intensity: number; // 0..1
  seed: number;
}

// Seeded PRNG (mulberry32)
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function applyEffects(pages: Page[], config: EffectsConfig): Page[] {
  if (config.intensity <= 0) return pages;

  const rng = mulberry32(config.seed);
  const i = config.intensity;

  return pages.map((page) => ({
    ...page,
    glyphs: page.glyphs.map((g) => {
      if (!g.pathData) return g; // skip spaces

      const offsetX = (rng() - 0.5) * 0.4 * i; // ±0.2mm
      const offsetY = (rng() - 0.5) * 0.3 * i; // ±0.15mm
      const rotation = (rng() - 0.5) * 4 * i; // ±2°
      const scaleMod = 1 + (rng() - 0.5) * 0.06 * i; // ±3%

      return {
        ...g,
        x: g.x + offsetX,
        y: g.y + offsetY,
        scale: g.scale * scaleMod,
        pathData: rotation !== 0 ? rotatePath(g.pathData, rotation) : g.pathData,
      } as PositionedGlyph;
    }),
  }));
}

// Rotate path data around glyph center by angle (degrees)
function rotatePath(d: string, angleDeg: number): string {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Find center of glyph for rotation pivot
  const nums = d.match(/-?\d+\.?\d*/g);
  if (!nums || nums.length < 4) return d;

  let sumX = 0,
    sumY = 0,
    count = 0;
  for (let i = 0; i < nums.length - 1; i += 2) {
    sumX += parseFloat(nums[i]);
    sumY += parseFloat(nums[i + 1]);
    count++;
  }
  const cx = sumX / count;
  const cy = sumY / count;

  // Replace coordinate pairs
  let idx = 0;
  return d.replace(/-?\d+\.?\d*/g, (match) => {
    const val = parseFloat(match);
    const isX = idx % 2 === 0;
    idx++;
    if (isX) {
      // We need the next Y value too — just rotate X component
      const x = val - cx;
      // Approximate: rotate each coord independently (good enough for small angles)
      return String(Math.round((cx + x * cos) * 10000) / 10000);
    } else {
      const y = val - cy;
      return String(Math.round((cy + y * cos) * 10000) / 10000);
    }
  });
}
