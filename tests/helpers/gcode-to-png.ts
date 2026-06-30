import sharp from 'sharp';

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export async function gcodeToImage(
  gcode: string,
  widthMm: number,
  heightMm: number
): Promise<Buffer> {
  const scale = 20; // 20px per mm
  const w = Math.round(widthMm * scale);
  const h = Math.round(heightMm * scale);

  const segments: Segment[] = [];
  const penDownPts: { x: number; y: number }[] = [];
  const penUpPts: { x: number; y: number }[] = [];
  let penDown = false;
  let cx = 0,
    cy = 0;

  for (const line of gcode.split('\n')) {
    const trimmed = line.trim();
    if (/^G0?0\s+Z\s*[\d.]+/.test(trimmed)) {
      if (penDown) penUpPts.push({ x: cx * scale, y: (heightMm - cy) * scale });
      penDown = false;
      continue;
    }
    if (/^G0?[01]\s+Z\s*(-[\d.]+|0(\.0+)?)\b/.test(trimmed)) {
      penDown = true;
      penDownPts.push({ x: cx * scale, y: (heightMm - cy) * scale });
      continue;
    }

    const match = trimmed.match(/^G0?[01]\s+X([-\d.]+)\s+Y([-\d.]+)/);
    if (match) {
      const nx = parseFloat(match[1]);
      const ny = parseFloat(match[2]);
      if (penDown && /^G0?1/.test(trimmed)) {
        segments.push({
          x1: cx * scale,
          y1: (heightMm - cy) * scale,
          x2: nx * scale,
          y2: (heightMm - ny) * scale,
        });
      }
      cx = nx;
      cy = ny;
    }
  }

  // Build SVG
  const lines = segments
    .map(
      (s) =>
        `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="#000" stroke-width="4" stroke-linecap="round"/>`
    )
    .join('\n');
  const greenDots = penDownPts
    .map((p) => `<circle cx="${p.x}" cy="${p.y}" r="6" fill="#00cc00"/>`)
    .join('\n');
  const redDots = penUpPts
    .map((p) => `<circle cx="${p.x}" cy="${p.y}" r="6" fill="#cc0000"/>`)
    .join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="white"/>
${lines}
${greenDots}
${redDots}
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
