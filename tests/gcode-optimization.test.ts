import { describe, it, expect } from 'vitest';
import { convert } from '../src/core/pipeline';
import { pangramPrint } from './helpers/create-docx';
import { PRESETS } from '../src/core/gcode';

describe('G-code optimization', () => {
  it('stroke reversal reduces pen-up travel below 1950mm for pangram', async () => {
    const docx = await pangramPrint();
    const config = { gcode: { ...PRESETS.zAxis }, effects: { intensity: 0, seed: 42 } };
    const result = await convert(docx, config);
    const lines = result.gcode.split('\n');

    let totalTravel = 0;
    let lastX = 0,
      lastY = 0;

    for (const line of lines) {
      const match = line.match(/G00\s+X([-\d.]+)\s+Y([-\d.]+)/);
      if (match) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        totalTravel += Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
        lastX = x;
        lastY = y;
      }
      // Track position from G01 moves too (for accurate next-G00 distance)
      const drawMatch = line.match(/G01\s+X([-\d.]+)\s+Y([-\d.]+)/);
      if (drawMatch) {
        lastX = parseFloat(drawMatch[1]);
        lastY = parseFloat(drawMatch[2]);
      }
    }

    // Without stroke reversal: ~2111mm travel
    // With stroke reversal: ~1920mm travel (~11% reduction)
    // Assert it stays below 1950mm (allowing some margin)
    expect(totalTravel).toBeLessThan(1950);
    // And above 1500mm (sanity check — not unrealistically low)
    expect(totalTravel).toBeGreaterThan(1500);
  });
});
