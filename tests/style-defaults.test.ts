import { describe, it, expect } from 'vitest';
import { Document, Packer, Paragraph, TextRun, LineRuleType } from 'docx';
import { convert } from '../src/core/pipeline';
import { parseDocx } from '../src/core/docx-parser';
import { PRESETS } from '../src/core/gcode';

const testConfig = { gcode: { ...PRESETS.zAxis }, effects: { intensity: 0, seed: 42 } };

// Multi-paragraph text long enough to wrap and span lines.
const LINES = [
  'Перший рядок тексту достатньо довгий щоб перенестися на наступний рядок сторінки.',
  'Другий абзац так само має містити чимало слів для перевірки переносу і інтервалів.',
  'Третій абзац завершує документ і теж розтягнутий на декілька рядків тексту тут.',
];

// Char spacing -4 twips (condensed ~0.2pt), line spacing 192/240 = 0.8 (multiple).
const CHAR_SPACING = -4;
const LINE = 192;

/**
 * Variant A: formatting lives ONLY in the document's default (Normal) style.
 * Paragraphs/runs carry no explicit spacing — the parser must read styles.xml.
 */
async function makeStyleBased(): Promise<ArrayBuffer> {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: { name: 'Slimamif Light' }, size: 24, characterSpacing: CHAR_SPACING },
          paragraph: { spacing: { line: LINE, lineRule: LineRuleType.AUTO } },
        },
      },
    },
    sections: [{ children: LINES.map((t) => new Paragraph({ children: [new TextRun(t)] })) }],
  });
  return new Uint8Array(await Packer.toBuffer(doc)).buffer;
}

/**
 * Variant B: same visual result, but formatting is explicit on every
 * paragraph and run (no reliance on the default style).
 */
async function makeExplicit(): Promise<ArrayBuffer> {
  const doc = new Document({
    styles: { default: { document: { run: { font: { name: 'Slimamif Light' }, size: 24 } } } },
    sections: [
      {
        children: LINES.map(
          (t) =>
            new Paragraph({
              spacing: { line: LINE, lineRule: LineRuleType.AUTO },
              children: [new TextRun({ text: t, characterSpacing: CHAR_SPACING })],
            })
        ),
      },
    ],
  });
  return new Uint8Array(await Packer.toBuffer(doc)).buffer;
}

describe('Normal-style defaults are applied as fallback', () => {
  it('style-based and explicit formatting produce the same parsed spacing', async () => {
    const styleDoc = await parseDocx(await makeStyleBased());
    const explicitDoc = await parseDocx(await makeExplicit());

    // Line spacing resolved from the Normal style must match explicit value.
    expect(styleDoc.paragraphs[0].format.spacing.line).toBeCloseTo(
      explicitDoc.paragraphs[0].format.spacing.line,
      4
    );
    // 192/240 = 0.8
    expect(styleDoc.paragraphs[0].format.spacing.line).toBeCloseTo(0.8, 4);

    // Char spacing resolved from the Normal style must match explicit value.
    expect(styleDoc.paragraphs[0].runs[0]?.charSpacing).toBeCloseTo(
      explicitDoc.paragraphs[0].runs[0]?.charSpacing ?? 0,
      4
    );
    // -4 twips in mm
    expect(styleDoc.paragraphs[0].runs[0]?.charSpacing).toBeLessThan(0);
  });

  it('both variants render to the same number of pages and glyphs', async () => {
    const styleRes = await convert(await makeStyleBased(), JSON.parse(JSON.stringify(testConfig)));
    const explicitRes = await convert(await makeExplicit(), JSON.parse(JSON.stringify(testConfig)));

    const glyphs = (r: typeof styleRes) => r.pages.reduce((s, p) => s + p.glyphs.length, 0);

    expect(styleRes.pages.length).toBe(explicitRes.pages.length);
    expect(glyphs(styleRes)).toBe(glyphs(explicitRes));
  });
});
