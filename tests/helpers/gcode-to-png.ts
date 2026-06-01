import sharp from 'sharp';

interface Segment {
  x1: number; y1: number;
  x2: number; y2: number;
}

export async function gcodeToImage(gcode: string, widthMm: number, heightMm: number): Promise<Buffer> {
  const scale = 2; // 2px per mm
  const w = Math.round(widthMm * scale);
  const h = Math.round(heightMm * scale);

  const segments: Segment[] = [];
  let penDown = false;
  let cx = 0, cy = 0;

  for (const line of gcode.split('\n')) {
    const trimmed = line.trim();
    // Pen up: G0 Z5, G00 Z0.300, etc (any positive Z move)
    if (/^G0?0\s+Z\s*[\d.]+/.test(trimmed)) { penDown = false; continue; }
    // Pen down: G0 Z0, G01 Z-0.200 F5000, etc (Z0 or negative Z)
    if (/^G0?[01]\s+Z\s*(-[\d.]+|0(\.0+)?)\b/.test(trimmed)) { penDown = true; continue; }

    const match = trimmed.match(/^G0?[01]\s+X([-\d.]+)\s+Y([-\d.]+)/);
    if (match) {
      const nx = parseFloat(match[1]);
      const ny = parseFloat(match[2]);
      if (penDown && /^G0?1/.test(trimmed)) {
        segments.push({ x1: cx * scale, y1: (heightMm - cy) * scale, x2: nx * scale, y2: (heightMm - ny) * scale });
      }
      cx = nx;
      cy = ny;
    }
  }

  // Build SVG
  const lines = segments.map(s =>
    `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="#000" stroke-width="0.8" stroke-linecap="round"/>`
  ).join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="white"/>
${lines}
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
