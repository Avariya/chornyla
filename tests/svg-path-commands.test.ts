import { describe, it, expect } from 'vitest';
import { generateGcode, PRESETS } from '../src/core/gcode';
import type { Page, PositionedGlyph } from '../src/core/layout';

function makePage(pathData: string): Page {
  const glyph: PositionedGlyph = {
    x: 10,
    y: 20,
    scale: 0.01,
    char: 'X',
    fontSize: 12,
    pathData,
  };
  return { glyphs: [glyph], width: 210, height: 297 };
}

describe('SVG path commands in G-code generation', () => {
  const config = { ...PRESETS.zAxis };

  it('handles absolute cubic Bézier (C)', () => {
    // M 0 0 C 100 0 200 100 300 100 — cubic curve
    const page = makePage('M 0 0 C 100 0 200 100 300 100');
    const gcode = generateGcode([page], config);
    const g01Lines = gcode.split('\n').filter((l) => l.startsWith('G01'));
    // Should produce multiple G01 moves from flattened curve
    expect(g01Lines.length).toBeGreaterThan(2);
  });

  it('handles absolute quadratic Bézier (Q)', () => {
    // M 0 0 Q 150 200 300 0 — quadratic curve
    const page = makePage('M 0 0 Q 150 200 300 0');
    const gcode = generateGcode([page], config);
    const g01Lines = gcode.split('\n').filter((l) => l.startsWith('G01'));
    expect(g01Lines.length).toBeGreaterThan(2);
  });

  it('handles relative quadratic Bézier (q)', () => {
    // M 0 0 q 150 200 300 0 — relative quadratic
    const page = makePage('M 0 0 q 150 200 300 0');
    const gcode = generateGcode([page], config);
    const g01Lines = gcode.split('\n').filter((l) => l.startsWith('G01'));
    expect(g01Lines.length).toBeGreaterThan(2);
  });

  it('C produces different points than a straight line', () => {
    const pageCurve = makePage('M 0 0 C 0 300 300 300 300 0');
    const pageLine = makePage('M 0 0 L 300 0');
    const gcodeCurve = generateGcode([pageCurve], config);
    const gcodeLine = generateGcode([pageLine], config);
    // Curve should have more G01 points than a simple line
    const curveMoves = gcodeCurve.split('\n').filter((l) => l.startsWith('G01'));
    const lineMoves = gcodeLine.split('\n').filter((l) => l.startsWith('G01'));
    expect(curveMoves.length).toBeGreaterThan(lineMoves.length);
  });

  it('Q and q with same offsets produce same result', () => {
    // Absolute: start at 0,0 control at 150,200 end at 300,0
    const pageQ = makePage('M 0 0 Q 150 200 300 0');
    // Relative from 0,0: same deltas
    const pageq = makePage('M 0 0 q 150 200 300 0');
    const gcodeQ = generateGcode([pageQ], config);
    const gcodeq = generateGcode([pageq], config);
    // Should be identical since starting at 0,0
    expect(gcodeQ).toBe(gcodeq);
  });

  it('multiple C commands in sequence work', () => {
    const page = makePage('M 0 0 C 50 100 100 100 150 0 C 200 -100 250 -100 300 0');
    const gcode = generateGcode([page], config);
    const g01Lines = gcode.split('\n').filter((l) => l.startsWith('G01'));
    // Two curves should produce more points than one
    expect(g01Lines.length).toBeGreaterThan(5);
  });
});
