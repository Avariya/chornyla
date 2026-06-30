import { describe, it, expect } from 'vitest';
import { convert } from '../src/core/pipeline';
import { basicText } from './helpers/create-docx';
import { PRESETS } from '../src/core/gcode';

describe('G-code presets', () => {
  describe('servo preset', () => {
    it('uses M3 S0 for pen up and M3 S50 for pen down', async () => {
      const docx = await basicText();
      const result = await convert(docx, {
        gcode: { ...PRESETS.servo },
        effects: { intensity: 0, seed: 42 },
      });
      const lines = result.gcode.split('\n');
      expect(lines.some((l) => l === 'M3 S0')).toBe(true);
      expect(lines.some((l) => l === 'M3 S50')).toBe(true);
    });

    it('does NOT contain Z-axis movements', async () => {
      const docx = await basicText();
      const result = await convert(docx, {
        gcode: { ...PRESETS.servo },
        effects: { intensity: 0, seed: 42 },
      });
      expect(result.gcode).not.toContain('Z0.300');
      expect(result.gcode).not.toContain('Z-0.200');
    });
  });

  describe('custom config', () => {
    it('uses custom penUp/penDown strings', async () => {
      const docx = await basicText();
      const result = await convert(docx, {
        gcode: {
          ...PRESETS.custom,
          penUp: 'G00 Z5.000',
          penDown: 'G01 Z-1.000 F3000',
        },
        effects: { intensity: 0, seed: 42 },
      });
      const lines = result.gcode.split('\n');
      expect(lines.some((l) => l === 'G00 Z5.000')).toBe(true);
      expect(lines.some((l) => l === 'G01 Z-1.000 F3000')).toBe(true);
    });

    it('includes custom startCode in header', async () => {
      const docx = await basicText();
      const result = await convert(docx, {
        gcode: {
          ...PRESETS.custom,
          startCode: 'G92 X10 Y5\nG28',
        },
        effects: { intensity: 0, seed: 42 },
      });
      const lines = result.gcode.split('\n');
      expect(lines).toContain('G92 X10 Y5');
      expect(lines).toContain('G28');
    });

    it('includes custom endCode in footer', async () => {
      const docx = await basicText();
      const result = await convert(docx, {
        gcode: {
          ...PRESETS.custom,
          endCode: 'G00 X0 Y0\nM84',
        },
        effects: { intensity: 0, seed: 42 },
      });
      const lines = result.gcode.split('\n');
      expect(lines).toContain('G00 X0 Y0');
      expect(lines).toContain('M84');
    });

    it('custom endCode replaces default home return', async () => {
      const docx = await basicText();
      const resultDefault = await convert(docx, {
        gcode: { ...PRESETS.zAxis, endCode: '' },
        effects: { intensity: 0, seed: 42 },
      });
      const resultCustom = await convert(docx, {
        gcode: { ...PRESETS.zAxis, endCode: 'G00 X0 Y0' },
        effects: { intensity: 0, seed: 42 },
      });

      // Default: returns to homeX/homeY (G00 X30.0000 Y0.0000)
      expect(resultDefault.gcode).toContain('G00 X30.0000 Y0.0000');
      // Custom endCode: uses custom instead
      const customLines = resultCustom.gcode.split('\n');
      const footerIdx = customLines.lastIndexOf('G00 X0 Y0');
      expect(footerIdx).toBeGreaterThan(0);
    });
  });
});
