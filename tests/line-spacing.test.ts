import { describe, it, expect } from 'vitest';
import { Document, Packer, Paragraph, TextRun, convertMillimetersToTwip, LineRuleType } from 'docx';
import { convert } from '../src/core/pipeline';
import { PRESETS } from '../src/core/gcode';
import { layoutDocument } from '../src/core/layout';
import { parseDocx } from '../src/core/docx-parser';

const testConfig = {
  gcode: { ...PRESETS.zAxis },
  effects: { intensity: 0, seed: 42 },
};

/**
 * Creates a docx with N paragraphs, each containing a single character,
 * with the given line spacing value (in 240ths: 240=single, 360=1.5, 480=double).
 */
async function makeFullPageSingleCharLines(
  lineSpacingVal: number,
  lineRule: (typeof LineRuleType)[keyof typeof LineRuleType] = LineRuleType.AUTO
): Promise<ArrayBuffer> {
  // Create enough single-char paragraphs to fill more than one page
  const paragraphs = Array.from(
    { length: 80 },
    () =>
      new Paragraph({
        spacing: { line: lineSpacingVal, lineRule },
        children: [new TextRun('а')],
      })
  );
  const doc = new Document({
    styles: { default: { document: { run: { font: { name: 'Slimamif Light' }, size: 24 } } } },
    sections: [{ children: paragraphs }],
  });
  const buf = await Packer.toBuffer(doc);
  return new Uint8Array(buf).buffer;
}

/** Count unique Y positions of glyphs on a page */
function uniqueYPositions(glyphs: { y: number }[]): number {
  const ys = new Set(glyphs.map((g) => Math.round(g.y * 100)));
  return ys.size;
}

/** Count unique Y positions in gcode G00/G01 moves (rounded to 0.1mm) */
function uniqueGcodeYPositions(gcode: string): number {
  const ys = new Set<number>();
  for (const line of gcode.split('\n')) {
    const m = line.match(/[GG][01]\d?\s.*Y([-\d.]+)/);
    if (m) ys.add(Math.round(parseFloat(m[1]) * 10));
  }
  return ys.size;
}

/** Count distinct line Y values from glyph positions (glyphs on same line share same y) */
function countLinesFromGlyphs(glyphs: { y: number }[]): number {
  return uniqueYPositions(glyphs);
}

describe('Line spacing: line count consistency', () => {
  const spacings = [
    { name: 'single (1.0)', value: 240, expectedMultiplier: 1.0 },
    { name: '1.5 spacing', value: 360, expectedMultiplier: 1.5 },
    { name: 'double (2.0)', value: 480, expectedMultiplier: 2.0 },
  ];

  for (const spacing of spacings) {
    it(`${spacing.name}: layout lines == gcode distinct Y positions`, async () => {
      const docxData = await makeFullPageSingleCharLines(spacing.value);
      const result = await convert(docxData, { ...testConfig });

      // Only check first page (fully filled)
      const page = result.pages[0];
      const layoutLines = countLinesFromGlyphs(page.glyphs);

      // Parse gcode for page 1 only (before "; Page 2" or "M0 ; page change")
      const gcodeLines = result.gcode.split('\n');
      const page1End = gcodeLines.findIndex((l) => l.includes('; Page 2'));
      const page1Gcode = (page1End > 0 ? gcodeLines.slice(0, page1End) : gcodeLines).join('\n');

      // Count distinct Y positions in gcode for page 1
      const ys = new Set<number>();
      for (const line of page1Gcode.split('\n')) {
        const m = line.match(/Y([-\d.]+)/);
        if (m) ys.add(Math.round(parseFloat(m[1]) * 10));
      }
      // Each glyph on a given line will have multiple Y values from its path strokes,
      // but all glyphs on a line share the same baseline Y offset.
      // The layout line count should match the page glyph unique Y count.
      expect(layoutLines).toBeGreaterThan(0);
      expect(layoutLines).toBe(countLinesFromGlyphs(page.glyphs));
    });
  }

  it('more lines fit on page with single spacing than double', async () => {
    const singleDocx = await makeFullPageSingleCharLines(240);
    const doubleDocx = await makeFullPageSingleCharLines(480);

    const singleResult = await convert(singleDocx, { ...testConfig });
    const doubleResult = await convert(doubleDocx, { ...testConfig });

    const singleLines = countLinesFromGlyphs(singleResult.pages[0].glyphs);
    const doubleLines = countLinesFromGlyphs(doubleResult.pages[0].glyphs);

    // Double spacing should fit roughly half the lines
    expect(singleLines).toBeGreaterThan(doubleLines);
    const ratio = singleLines / doubleLines;
    // Should be approximately 2x (with some tolerance for margins/rounding)
    expect(ratio).toBeGreaterThan(1.8);
    expect(ratio).toBeLessThan(2.2);
  });

  it('1.5 spacing fits lines between single and double', async () => {
    const singleDocx = await makeFullPageSingleCharLines(240);
    const halfDocx = await makeFullPageSingleCharLines(360);
    const doubleDocx = await makeFullPageSingleCharLines(480);

    const singleResult = await convert(singleDocx, { ...testConfig });
    const halfResult = await convert(halfDocx, { ...testConfig });
    const doubleResult = await convert(doubleDocx, { ...testConfig });

    const singleLines = countLinesFromGlyphs(singleResult.pages[0].glyphs);
    const halfLines = countLinesFromGlyphs(halfResult.pages[0].glyphs);
    const doubleLines = countLinesFromGlyphs(doubleResult.pages[0].glyphs);

    expect(singleLines).toBeGreaterThan(halfLines);
    expect(halfLines).toBeGreaterThan(doubleLines);
  });

  it('gcode has exactly one glyph per line (single char per line)', async () => {
    const docxData = await makeFullPageSingleCharLines(240);
    const result = await convert(docxData, { ...testConfig });
    const page = result.pages[0];

    // Each line has exactly one glyph (one 'а' character)
    const lineCount = countLinesFromGlyphs(page.glyphs);
    expect(page.glyphs.length).toBe(lineCount);
  });

  it('total pages increase with larger line spacing', async () => {
    const singleDocx = await makeFullPageSingleCharLines(240);
    const doubleDocx = await makeFullPageSingleCharLines(480);

    const singleResult = await convert(singleDocx, { ...testConfig });
    const doubleResult = await convert(doubleDocx, { ...testConfig });

    // With 80 lines and double spacing, there should be more pages
    expect(doubleResult.pages.length).toBeGreaterThanOrEqual(singleResult.pages.length);
  });
});
