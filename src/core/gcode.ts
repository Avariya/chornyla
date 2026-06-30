import { Page, PositionedGlyph } from './layout';

export interface GcodeConfig {
  penUp: string; // e.g. "G0 Z5" or "M3 S0"
  penDown: string; // e.g. "G0 Z0" or "M3 S50"
  feedRate: number; // mm/min for drawing (G1)
  travelRate: number; // mm/min for rapid moves (G0)
  pageHeight: number; // for Y-axis inversion (mm)
  startCode: string; // inserted after G21 header line
  endCode: string; // inserted before M05/M30
}

export const PRESETS = {
  zAxis: {
    penUp: 'G00 Z0.300',
    penDown: 'G01 Z-0.200 F5000',
    feedRate: 5000,
    travelRate: 5000,
    pageHeight: 297,
    startCode: 'G92 X30',
    endCode: '',
  },
  servo: {
    penUp: 'M3 S0',
    penDown: 'M3 S50',
    feedRate: 5000,
    travelRate: 5000,
    pageHeight: 297,
    startCode: 'G92 X30',
    endCode: '',
  },
  custom: {
    penUp: 'G00 Z0.300',
    penDown: 'G01 Z-0.200 F5000',
    feedRate: 5000,
    travelRate: 5000,
    pageHeight: 297,
    startCode: 'G92 X30',
    endCode: '',
  },
} as const;

// Parse SVG path 'd' attribute into commands
interface PathCmd {
  type: string;
  args: number[];
}

function parsePath(d: string): PathCmd[] {
  const cmds: PathCmd[] = [];
  const re = /([MLCQZmlcqz])\s*([-\d.,\s]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d)) !== null) {
    const type = m[1];
    const args = m[2].trim()
      ? m[2]
          .trim()
          .split(/[\s,]+/)
          .map(Number)
      : [];
    cmds.push({ type, args });
  }
  return cmds;
}

// Adaptive Bezier flattening (cubic)
function flattenCubic(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  tolerance: number,
  points: number[][]
) {
  const dx = x3 - x0,
    dy = y3 - y0;
  const d1 = Math.abs((x1 - x3) * dy - (y1 - y3) * dx);
  const d2 = Math.abs((x2 - x3) * dy - (y2 - y3) * dx);
  if ((d1 + d2) * (d1 + d2) <= tolerance * tolerance * (dx * dx + dy * dy)) {
    points.push([x3, y3]);
    return;
  }
  const mx = (x0 + 3 * x1 + 3 * x2 + x3) / 8;
  const my = (y0 + 3 * y1 + 3 * y2 + y3) / 8;
  flattenCubic(
    x0,
    y0,
    (x0 + x1) / 2,
    (y0 + y1) / 2,
    (x0 + 2 * x1 + x2) / 4,
    (y0 + 2 * y1 + y2) / 4,
    mx,
    my,
    tolerance,
    points
  );
  flattenCubic(
    mx,
    my,
    (x1 + 2 * x2 + x3) / 4,
    (y1 + 2 * y2 + y3) / 4,
    (x2 + x3) / 2,
    (y2 + y3) / 2,
    x3,
    y3,
    tolerance,
    points
  );
}

// Flatten quadratic Bezier
function flattenQuad(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  tolerance: number,
  points: number[][]
) {
  // Convert to cubic
  const cx1 = x0 + (2 / 3) * (x1 - x0);
  const cy1 = y0 + (2 / 3) * (y1 - y0);
  const cx2 = x2 + (2 / 3) * (x1 - x2);
  const cy2 = y2 + (2 / 3) * (y1 - y2);
  flattenCubic(x0, y0, cx1, cy1, cx2, cy2, x2, y2, tolerance, points);
}

// Convert a single glyph's path to absolute coordinates
function glyphToPoints(glyph: PositionedGlyph, pageHeight: number): number[][][] {
  const strokes: number[][][] = [];
  const cmds = parsePath(glyph.pathData);
  const s = glyph.scale;
  const ox = glyph.x;
  const oy = glyph.y;

  let cx = 0,
    cy = 0; // current position in font units
  let startX = 0,
    startY = 0;
  let currentStroke: number[][] = [];

  function tx(fx: number, fy: number): [number, number] {
    // Transform font coords to page coords, then invert Y for G-code
    const px = ox + fx * s;
    const py = oy + fy * s;
    return [Math.round(px * 10000) / 10000, Math.round((pageHeight - py) * 10000) / 10000];
  }

  for (const cmd of cmds) {
    const { type, args } = cmd;
    switch (type) {
      case 'M': {
        if (currentStroke.length > 1) strokes.push(currentStroke);
        cx = args[0];
        cy = args[1];
        startX = cx;
        startY = cy;
        currentStroke = [tx(cx, cy)];
        break;
      }
      case 'm': {
        if (currentStroke.length > 1) strokes.push(currentStroke);
        cx += args[0];
        cy += args[1];
        startX = cx;
        startY = cy;
        currentStroke = [tx(cx, cy)];
        break;
      }
      case 'L': {
        for (let i = 0; i < args.length; i += 2) {
          cx = args[i];
          cy = args[i + 1];
          currentStroke.push(tx(cx, cy));
        }
        break;
      }
      case 'l': {
        for (let i = 0; i < args.length; i += 2) {
          cx += args[i];
          cy += args[i + 1];
          currentStroke.push(tx(cx, cy));
        }
        break;
      }
      /* c8 ignore next 13 -- absolute cubic not used by current font */
      case 'C': {
        for (let i = 0; i < args.length; i += 6) {
          const pts: number[][] = [];
          const [px, py] = tx(cx, cy);
          const [x1t, y1t] = tx(args[i], args[i + 1]);
          const [x2t, y2t] = tx(args[i + 2], args[i + 3]);
          const [x3t, y3t] = tx(args[i + 4], args[i + 5]);
          flattenCubic(px, py, x1t, y1t, x2t, y2t, x3t, y3t, 0.1, pts);
          currentStroke.push(...pts);
          cx = args[i + 4];
          cy = args[i + 5];
        }
        break;
      }
      case 'c': {
        for (let i = 0; i < args.length; i += 6) {
          const pts: number[][] = [];
          const [px, py] = tx(cx, cy);
          const [x1t, y1t] = tx(cx + args[i], cy + args[i + 1]);
          const [x2t, y2t] = tx(cx + args[i + 2], cy + args[i + 3]);
          const [x3t, y3t] = tx(cx + args[i + 4], cy + args[i + 5]);
          flattenCubic(px, py, x1t, y1t, x2t, y2t, x3t, y3t, 0.1, pts);
          currentStroke.push(...pts);
          cx += args[i + 4];
          cy += args[i + 5];
        }
        break;
      }
      /* c8 ignore next 13 -- quadratic Bézier not used by current font */
      case 'Q': {
        for (let i = 0; i < args.length; i += 4) {
          const pts: number[][] = [];
          const [px, py] = tx(cx, cy);
          const [x1t, y1t] = tx(args[i], args[i + 1]);
          const [x2t, y2t] = tx(args[i + 2], args[i + 3]);
          flattenQuad(px, py, x1t, y1t, x2t, y2t, 0.1, pts);
          currentStroke.push(...pts);
          cx = args[i + 2];
          cy = args[i + 3];
        }
        break;
      }
      /* c8 ignore next 13 -- relative quadratic not used by current font */
      case 'q': {
        for (let i = 0; i < args.length; i += 4) {
          const pts: number[][] = [];
          const [px, py] = tx(cx, cy);
          const [x1t, y1t] = tx(cx + args[i], cy + args[i + 1]);
          const [x2t, y2t] = tx(cx + args[i + 2], cy + args[i + 3]);
          flattenQuad(px, py, x1t, y1t, x2t, y2t, 0.1, pts);
          currentStroke.push(...pts);
          cx += args[i + 2];
          cy += args[i + 3];
        }
        break;
      }
      case 'Z':
      case 'z': {
        if (cx !== startX || cy !== startY) {
          cx = startX;
          cy = startY;
          currentStroke.push(tx(cx, cy));
        }
        if (currentStroke.length > 1) strokes.push(currentStroke);
        currentStroke = [];
        break;
      }
    }
  }
  if (currentStroke.length > 1) strokes.push(currentStroke);
  return strokes;
}

export function generateGcode(pages: Page[], config: GcodeConfig): string {
  const lines: string[] = [];
  const { penUp, penDown, feedRate, travelRate } = config;

  // Parse home offset from G92 in startCode
  let homeX = 0,
    homeY = 0;
  if (config.startCode) {
    const g92 = config.startCode.match(/G92\s*(X([-\d.]+))?\s*(Y([-\d.]+))?/i);
    if (g92) {
      if (g92[2]) homeX = parseFloat(g92[2]);
      if (g92[4]) homeY = parseFloat(g92[4]);
    }
  }

  // Header
  lines.push('G21 G90 G40 G17');
  if (config.startCode) {
    for (const l of config.startCode.split('\n')) if (l.trim()) lines.push(l.trim());
  }
  lines.push('M03 S10000');
  lines.push('G04 P2');
  lines.push(penUp);

  // Track pen position for stroke reversal optimization
  let lastX = homeX,
    lastY = homeY;

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    if (pageIdx > 0) {
      lines.push(penUp);
      lines.push(`G00 X${homeX.toFixed(4)} Y${homeY.toFixed(4)}`);
      lines.push('M0 ; page change');
      lines.push('');
      lastX = homeX;
      lastY = homeY;
    }

    const page = pages[pageIdx];
    lines.push(`; Page ${pageIdx + 1}`);

    for (const glyph of page.glyphs) {
      if (!glyph.pathData) continue; // space
      const strokes = glyphToPoints(glyph, config.pageHeight);

      for (const stroke of strokes) {
        if (stroke.length < 2) continue;

        // Stroke reversal: choose direction that minimizes travel
        const startPt = stroke[0];
        const endPt = stroke[stroke.length - 1];
        const distToStart = (startPt[0] - lastX) ** 2 + (startPt[1] - lastY) ** 2;
        const distToEnd = (endPt[0] - lastX) ** 2 + (endPt[1] - lastY) ** 2;
        if (distToEnd < distToStart) {
          stroke.reverse();
        }

        // Pen up, move to start
        lines.push(penUp);
        lines.push(`G00 X${stroke[0][0].toFixed(4)} Y${stroke[0][1].toFixed(4)}`);
        lines.push(penDown);
        // Draw
        for (let i = 1; i < stroke.length; i++) {
          lines.push(`G01 X${stroke[i][0].toFixed(4)} Y${stroke[i][1].toFixed(4)} F${feedRate}`);
        }

        // Update last position
        lastX = stroke[stroke.length - 1][0];
        lastY = stroke[stroke.length - 1][1];
      }
    }
  }

  // Footer
  lines.push(penUp);
  if (config.endCode) {
    for (const l of config.endCode.split('\n')) if (l.trim()) lines.push(l.trim());
  } else {
    lines.push(`G00 X${homeX.toFixed(4)} Y${homeY.toFixed(4)}`);
  }
  lines.push('M05');
  lines.push('M30');

  return lines.join('\n');
}
