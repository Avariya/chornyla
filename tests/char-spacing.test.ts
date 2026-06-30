import { describe, it, expect } from 'vitest';
import { Document, Packer, Paragraph, TextRun, convertMillimetersToTwip } from 'docx';
import { convert } from '../src/core/pipeline';
import { PRESETS } from '../src/core/gcode';

const testConfig = { gcode: { ...PRESETS.zAxis }, effects: { intensity: 0, seed: 42 } };

async function makeWithCharSpacing(spacing: number): Promise<ArrayBuffer> {
  // spacing in twips (1pt = 20 twips). Negative = condensed, positive = expanded.
  const doc = new Document({
    styles: { default: { document: { run: { font: { name: 'Slimamif Light' }, size: 24 } } } },
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'абвгдежзийклмноп', characterSpacing: spacing })],
          }),
        ],
      },
    ],
  });
  const buf = await Packer.toBuffer(doc);
  return new Uint8Array(buf).buffer;
}

function lineWidth(glyphs: { x: number; char: string; scale: number }[]): number {
  if (glyphs.length === 0) return 0;
  const last = glyphs[glyphs.length - 1];
  const first = glyphs[0];
  return last.x - first.x;
}

describe('Character spacing (condensed/expanded)', () => {
  it('condensed text is narrower than normal', async () => {
    const normalDocx = await makeWithCharSpacing(0);
    const condensedDocx = await makeWithCharSpacing(-20); // -1pt

    const normalResult = await convert(normalDocx, JSON.parse(JSON.stringify(testConfig)));
    const condensedResult = await convert(condensedDocx, JSON.parse(JSON.stringify(testConfig)));

    const normalWidth = lineWidth(normalResult.pages[0].glyphs);
    const condensedWidth = lineWidth(condensedResult.pages[0].glyphs);

    expect(condensedWidth).toBeLessThan(normalWidth);
  });

  it('expanded text is wider than normal', async () => {
    const normalDocx = await makeWithCharSpacing(0);
    const expandedDocx = await makeWithCharSpacing(40); // +2pt

    const normalResult = await convert(normalDocx, JSON.parse(JSON.stringify(testConfig)));
    const expandedResult = await convert(expandedDocx, JSON.parse(JSON.stringify(testConfig)));

    const normalWidth = lineWidth(normalResult.pages[0].glyphs);
    const expandedWidth = lineWidth(expandedResult.pages[0].glyphs);

    expect(expandedWidth).toBeGreaterThan(normalWidth);
  });

  it('condensed text fits more chars per line before wrapping', async () => {
    const longText = 'а'.repeat(100);
    const makeDoc = async (spacing: number) => {
      const doc = new Document({
        styles: { default: { document: { run: { font: { name: 'Slimamif Light' }, size: 24 } } } },
        sections: [
          {
            children: [
              new Paragraph({
                children: [new TextRun({ text: longText, characterSpacing: spacing })],
              }),
            ],
          },
        ],
      });
      const buf = await Packer.toBuffer(doc);
      return new Uint8Array(buf).buffer;
    };

    const normalResult = await convert(await makeDoc(0), JSON.parse(JSON.stringify(testConfig)));
    const condensedResult = await convert(
      await makeDoc(-20),
      JSON.parse(JSON.stringify(testConfig))
    );

    // Count lines on first page (unique Y positions)
    const normalLines = new Set(normalResult.pages[0].glyphs.map((g) => Math.round(g.y * 100)))
      .size;
    const condensedLines = new Set(
      condensedResult.pages[0].glyphs.map((g) => Math.round(g.y * 100))
    ).size;

    // Condensed fits more per line → fewer lines for same text
    expect(condensedLines).toBeLessThan(normalLines);
  });

  it('expanded text wraps earlier', async () => {
    const longText = 'а'.repeat(200);
    const makeDoc = async (spacing: number) => {
      const doc = new Document({
        styles: { default: { document: { run: { font: { name: 'Slimamif Light' }, size: 24 } } } },
        sections: [
          {
            children: [
              new Paragraph({
                children: [new TextRun({ text: longText, characterSpacing: spacing })],
              }),
            ],
          },
        ],
      });
      const buf = await Packer.toBuffer(doc);
      return new Uint8Array(buf).buffer;
    };

    const normalResult = await convert(await makeDoc(0), JSON.parse(JSON.stringify(testConfig)));
    const expandedResult = await convert(await makeDoc(60), JSON.parse(JSON.stringify(testConfig)));

    const normalLines = new Set(normalResult.pages[0].glyphs.map((g) => Math.round(g.y * 100)))
      .size;
    const expandedLines = new Set(expandedResult.pages[0].glyphs.map((g) => Math.round(g.y * 100)))
      .size;

    // Expanded wraps sooner → more lines
    expect(expandedLines).toBeGreaterThan(normalLines);
  });

  it('all glyphs preserved in gcode regardless of spacing', async () => {
    const text = 'абвгдежзийклмноп'; // 16 chars
    for (const spacing of [-40, -20, 0, 20, 40]) {
      const docx = await makeWithCharSpacing(spacing);
      const result = await convert(docx, JSON.parse(JSON.stringify(testConfig)));
      const totalGlyphs = result.pages.reduce((s, p) => s + p.glyphs.length, 0);
      expect(totalGlyphs, `spacing=${spacing}`).toBe(16);
    }
  });
});
