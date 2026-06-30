import { describe, it, expect } from 'vitest';
import { applyEffects } from '../src/core/effects';
import type { Page, PositionedGlyph } from '../src/core/layout';

function makePage(glyphs: PositionedGlyph[]): Page {
  return { glyphs, width: 210, height: 297 };
}

function makeGlyph(overrides: Partial<PositionedGlyph> = {}): PositionedGlyph {
  return {
    x: 10,
    y: 20,
    scale: 1,
    char: 'А',
    fontSize: 12,
    pathData: 'M 0 0 L 5 10 L 10 0',
    ...overrides,
  };
}

describe('Handwriting effects', () => {
  const baseGlyphs = [
    makeGlyph({ x: 10, y: 20, char: 'П' }),
    makeGlyph({ x: 15, y: 20, char: 'р' }),
    makeGlyph({ x: 20, y: 20, char: ' ', pathData: undefined }), // space
    makeGlyph({ x: 25, y: 20, char: 'і' }),
  ];
  const basePage = makePage(baseGlyphs);

  it('intensity 0 returns identical glyphs', () => {
    const result = applyEffects([basePage], { intensity: 0, seed: 42 });
    expect(result).toEqual([basePage]);
  });

  it('intensity > 0 modifies glyph positions', () => {
    const result = applyEffects([basePage], { intensity: 1, seed: 42 });
    const original = basePage.glyphs.filter((g) => g.pathData);
    const modified = result[0].glyphs.filter((g) => g.pathData);

    // At least one glyph should have different x or y
    const anyDifferent = modified.some((g, i) => g.x !== original[i].x || g.y !== original[i].y);
    expect(anyDifferent).toBe(true);
  });

  it('same seed produces identical results (deterministic)', () => {
    const r1 = applyEffects([basePage], { intensity: 0.7, seed: 123 });
    const r2 = applyEffects([basePage], { intensity: 0.7, seed: 123 });
    expect(r1).toEqual(r2);
  });

  it('different seeds produce different results', () => {
    const r1 = applyEffects([basePage], { intensity: 0.7, seed: 100 });
    const r2 = applyEffects([basePage], { intensity: 0.7, seed: 200 });

    const g1 = r1[0].glyphs.filter((g) => g.pathData);
    const g2 = r2[0].glyphs.filter((g) => g.pathData);
    const allSame = g1.every((g, i) => g.x === g2[i].x && g.y === g2[i].y);
    expect(allSame).toBe(false);
  });

  it('offsets stay within bounds (±0.2mm X, ±0.15mm Y, ±3% scale)', () => {
    // Use many glyphs to get good statistical coverage
    const manyGlyphs = Array.from({ length: 100 }, (_, i) => makeGlyph({ x: i * 5, y: 20 }));
    const page = makePage(manyGlyphs);
    const result = applyEffects([page], { intensity: 1, seed: 42 });

    for (let i = 0; i < 100; i++) {
      const orig = manyGlyphs[i];
      const mod = result[0].glyphs[i];
      expect(Math.abs(mod.x - orig.x)).toBeLessThanOrEqual(0.2 + 1e-10);
      expect(Math.abs(mod.y - orig.y)).toBeLessThanOrEqual(0.15 + 1e-10);
      expect(mod.scale).toBeGreaterThanOrEqual(0.97 - 1e-10);
      expect(mod.scale).toBeLessThanOrEqual(1.03 + 1e-10);
    }
  });

  it('spaces (pathData undefined) are not modified', () => {
    const result = applyEffects([basePage], { intensity: 1, seed: 42 });
    const spaceIdx = 2; // the space glyph
    expect(result[0].glyphs[spaceIdx]).toEqual(basePage.glyphs[spaceIdx]);
  });
});
