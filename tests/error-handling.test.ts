import { describe, it, expect } from 'vitest';
import { convert } from '../src/core/pipeline';
import { PRESETS } from '../src/core/gcode';
import JSZip from 'jszip';
import { Document, Packer, Paragraph, TextRun } from 'docx';

const config = { gcode: { ...PRESETS.zAxis }, effects: { intensity: 0, seed: 42 } };

describe('Error handling', () => {
  it('rejects empty ArrayBuffer', async () => {
    const empty = new ArrayBuffer(0);
    await expect(convert(empty, config)).rejects.toThrow();
  });

  it('rejects invalid zip (random bytes)', async () => {
    const random = new Uint8Array(256);
    for (let i = 0; i < 256; i++) random[i] = Math.floor(Math.random() * 256);
    await expect(convert(random.buffer, config)).rejects.toThrow();
  });

  it('rejects valid zip without word/document.xml', async () => {
    const zip = new JSZip();
    zip.file('dummy.txt', 'hello');
    const buf = await zip.generateAsync({ type: 'arraybuffer' });
    await expect(convert(buf, config)).rejects.toThrow();
  });

  it('handles docx with empty text without crashing', async () => {
    const doc = new Document({
      sections: [{ children: [new Paragraph({ children: [] })] }],
    });
    const buf = await Packer.toBuffer(doc);
    const arrayBuf = new Uint8Array(buf).buffer;

    const result = await convert(arrayBuf, config);
    // Should produce valid gcode with header/footer but no draw moves
    expect(result.gcode).toContain('G21');
    expect(result.gcode).toContain('M30');
  });

  it('handles unknown characters (emoji) without crashing', async () => {
    const doc = new Document({
      styles: {
        default: {
          document: { run: { font: { name: 'Slimamif Light' }, size: 24 } },
        },
      },
      sections: [
        {
          children: [
            new Paragraph({
              children: [new TextRun('Hello 🎉🔥 Привіт 你好')],
            }),
          ],
        },
      ],
    });
    const buf = await Packer.toBuffer(doc);
    const arrayBuf = new Uint8Array(buf).buffer;

    const result = await convert(arrayBuf, config);
    // Should not crash — unknown chars are skipped, known chars are rendered
    expect(result.gcode).toContain('G21');
    expect(result.gcode).toContain('M30');
    // Should still have some drawing (from 'Hello' and 'Привіт')
    expect(result.gcode).toContain('G01');
  });
});
