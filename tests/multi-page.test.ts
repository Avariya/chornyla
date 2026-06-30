import { describe, it, expect } from 'vitest';
import { convert } from '../src/core/pipeline';
import { multiPage } from './helpers/create-docx';
import { PRESETS } from '../src/core/gcode';

describe('Multi-page documents', () => {
  const config = { gcode: { ...PRESETS.zAxis }, effects: { intensity: 0, seed: 42 } };

  it('generates multiple pages for long text', async () => {
    const docx = await multiPage();
    const result = await convert(docx, config);
    expect(result.pages.length).toBeGreaterThan(1);
  });

  it('G-code contains M0 page change commands', async () => {
    const docx = await multiPage();
    const result = await convert(docx, config);
    const pageChanges = result.gcode.split('\n').filter((l) => l.includes('M0 ; page change'));
    expect(pageChanges.length).toBe(result.pages.length - 1);
  });

  it('pen returns to home position before page change', async () => {
    const docx = await multiPage();
    const result = await convert(docx, config);
    const lines = result.gcode.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('M0 ; page change')) {
        // Line before page change should be G00 to home (X30 Y0 based on G92 X30)
        const moveLine = lines[i - 1];
        expect(moveLine).toMatch(/G00\s+X30\.0000\s+Y0\.0000/);
      }
    }
  });

  it('Page N comments match pages.length', async () => {
    const docx = await multiPage();
    const result = await convert(docx, config);
    const pageComments = result.gcode.split('\n').filter((l) => l.match(/^; Page \d+$/));
    expect(pageComments.length).toBe(result.pages.length);
  });

  it('each page has drawing content after its comment', async () => {
    const docx = await multiPage();
    const result = await convert(docx, config);
    const lines = result.gcode.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^; Page \d+$/)) {
        // There should be G01 moves (drawing) after this comment
        const rest = lines.slice(i + 1, i + 50).join('\n');
        expect(rest).toContain('G01');
      }
    }
  });
});
