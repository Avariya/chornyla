import { parseDocx } from './docx-parser';
import { layoutDocument, Page } from './layout';
import { applyEffects, EffectsConfig } from './effects';
import { generateGcode, GcodeConfig, PRESETS } from './gcode';
import { setItalic } from './font';

export interface ConvertConfig {
  gcode: GcodeConfig;
  effects: EffectsConfig;
  fontStyle?: 'print' | 'italic';
}

export interface ConvertResult {
  gcode: string;
  pages: Page[]; // for preview
  warnings: string[];
}

export const DEFAULT_CONFIG: ConvertConfig = {
  gcode: { ...PRESETS.zAxis },
  effects: { intensity: 0.5, seed: 42 },
};

export async function convert(
  docxData: ArrayBuffer,
  config: ConvertConfig = DEFAULT_CONFIG
): Promise<ConvertResult> {
  const warnings: string[] = [];

  // 1. Parse DOCX
  const doc = await parseDocx(docxData);

  // 2. Layout text
  setItalic(config.fontStyle === 'italic');
  let pages = layoutDocument(doc);

  // Update page height in gcode config
  config.gcode.pageHeight = doc.page.height;

  // 3. Apply handwriting effects
  if (config.effects.intensity > 0) {
    pages = applyEffects(pages, config.effects);
  }

  // 4. Generate G-code
  const gcode = generateGcode(pages, config.gcode);

  return { gcode, pages, warnings };
}

export { PRESETS } from './gcode';
export type { Page, PositionedGlyph } from './layout';
