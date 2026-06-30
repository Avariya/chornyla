import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { convert } from '../src/core/pipeline';
import { parseDocx } from '../src/core/docx-parser';
import { PRESETS } from '../src/core/gcode';

const testConfig = { gcode: { ...PRESETS.zAxis }, effects: { intensity: 0, seed: 42 } };

const downloadsDir = join(process.env.HOME || '', 'Downloads');

describe('Style defaults: both docs should produce same layout', () => {
  it('same line count and char spacing regardless of style vs explicit formatting', async () => {
    const changedBuf = readFileSync(join(downloadsDir, 'змінено стиль по замовченню.docx'));
    const defaultBuf = readFileSync(join(downloadsDir, 'без зміни стилю по замовченню.docx'));

    const changedAB = new Uint8Array(changedBuf).buffer;
    const defaultAB = new Uint8Array(defaultBuf).buffer;

    const changedDoc = await parseDocx(changedAB);
    const defaultDoc = await parseDocx(defaultAB);

    // Both should have same line spacing
    console.log('Changed style - para 0 spacing:', changedDoc.paragraphs[0].format.spacing);
    console.log('Default style - para 0 spacing:', defaultDoc.paragraphs[0].format.spacing);

    // Both should have same charSpacing in runs
    console.log(
      'Changed style - run 0 charSpacing:',
      changedDoc.paragraphs[0].runs[0]?.charSpacing
    );
    console.log(
      'Default style - run 0 charSpacing:',
      defaultDoc.paragraphs[0].runs[0]?.charSpacing
    );

    expect(changedDoc.paragraphs[0].format.spacing.line).toBeCloseTo(
      defaultDoc.paragraphs[0].format.spacing.line,
      4
    );
    expect(changedDoc.paragraphs[0].runs[0]?.charSpacing).toBeCloseTo(
      defaultDoc.paragraphs[0].runs[0]?.charSpacing || 0,
      4
    );

    // Full conversion should produce same number of pages and similar glyph positions
    const changedResult = await convert(changedAB, JSON.parse(JSON.stringify(testConfig)));
    const defaultResult = await convert(defaultAB, JSON.parse(JSON.stringify(testConfig)));

    console.log(
      'Changed: pages=' +
        changedResult.pages.length +
        ' glyphs=' +
        changedResult.pages.reduce((s, p) => s + p.glyphs.length, 0)
    );
    console.log(
      'Default: pages=' +
        defaultResult.pages.length +
        ' glyphs=' +
        defaultResult.pages.reduce((s, p) => s + p.glyphs.length, 0)
    );

    expect(changedResult.pages.length).toBe(defaultResult.pages.length);
  });
});
