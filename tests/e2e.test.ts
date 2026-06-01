import { describe, it, expect } from 'vitest';
import { convert } from '../src/core/pipeline';
import { PRESETS } from '../src/core/gcode';
import { gcodeToImage } from './helpers/gcode-to-png';
import { compareImages } from './helpers/compare-images';
import * as fixtures from './helpers/create-docx';
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOTS_DIR = join(__dirname, 'snapshots');
const OUTPUT_DIR = join(__dirname, 'output');
const UPDATE = !!process.env.UPDATE_SNAPSHOTS;

const testConfig = {
  gcode: { ...PRESETS.zAxis },
  effects: { intensity: 0, seed: 42 },
};

async function runTest(name: string, createDocx: () => Promise<ArrayBuffer>, configOverrides?: Partial<typeof testConfig>) {
  const docxData = await createDocx();
  const cfg = { ...JSON.parse(JSON.stringify(testConfig)), ...configOverrides };
  const result = await convert(docxData, cfg);
  const page = result.pages[0];
  const png = await gcodeToImage(result.gcode, page?.width || 210, page?.height || 297);

  if (!existsSync(SNAPSHOTS_DIR)) mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  const outputPath = join(OUTPUT_DIR, `${name}.png`);
  const snapshotPath = join(SNAPSHOTS_DIR, `${name}.png`);

  writeFileSync(outputPath, png);

  // Ensure image is not blank (has drawn content)
  const { data, info } = await sharp(png).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  let nonWhite = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) nonWhite++;
  }
  expect(nonWhite, `Image "${name}" is blank (no drawn content)`).toBeGreaterThan(0);

  if (UPDATE || !existsSync(snapshotPath)) {
    writeFileSync(snapshotPath, png);
    return;
  }

  const expected = readFileSync(snapshotPath);
  const { match, diffPercent } = await compareImages(png, expected);
  expect(match, `Image diff ${diffPercent.toFixed(2)}% for "${name}"`).toBe(true);
}

describe('E2E Visual Regression', () => {
  it('basic text', () => runTest('basic-text', fixtures.basicText));
  it('indent first line', () => runTest('indent-first-line', fixtures.indentFirstLine));
  it('indent left', () => runTest('indent-left', fixtures.indentLeft));
  it('tab stops', () => runTest('tab-stops', fixtures.tabStops));
  it('align center', () => runTest('align-center', fixtures.alignCenter));
  it('align right', () => runTest('align-right', fixtures.alignRight));
  it('font size large', () => runTest('font-size-large', fixtures.fontSizeLarge));
  it('line spacing double', () => runTest('line-spacing-double', fixtures.lineSpacingDouble));
  it('multi paragraph', () => runTest('multi-paragraph', fixtures.multiParagraph));
  it('cyrillic full', () => runTest('cyrillic-full', fixtures.cyrillicFull));
  it('special chars', () => runTest('special-chars', fixtures.specialChars));
  it('page A4 landscape', () => runTest('page-a4-landscape', fixtures.pageA4Landscape));
  it('page A3 portrait', () => runTest('page-a3-portrait', fixtures.pageA3Portrait));
  it('page A3 landscape', () => runTest('page-a3-landscape', fixtures.pageA3Landscape));
  it('ukrainian letters', () => runTest('ukrainian-letters', fixtures.ukrainianLetters));
  it('italic text', () => runTest('italic-text', fixtures.italicText, { fontStyle: 'italic' as const }));
  it('simplified alphabet', () => runTest('simplified-alphabet', fixtures.simplifiedAlphabet));
  it('pangram print', () => runTest('pangram-print', fixtures.pangramPrint));
  it('pangram italic', () => runTest('pangram-italic', fixtures.pangramItalic, { fontStyle: 'italic' as const }));
  it('top and bottom', () => runTest('top-and-bottom', fixtures.topAndBottom));
});
