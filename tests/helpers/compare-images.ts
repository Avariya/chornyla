import sharp from 'sharp';

export interface CompareResult {
  match: boolean;
  diffPercent: number;
}

export async function compareImages(actual: Buffer, expected: Buffer, threshold = 0.1): Promise<CompareResult> {
  const a = await sharp(actual).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const b = await sharp(expected).raw().ensureAlpha().toBuffer({ resolveWithObject: true });

  if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
    return { match: false, diffPercent: 100 };
  }

  const totalPixels = a.info.width * a.info.height;
  let diffPixels = 0;

  for (let i = 0; i < a.data.length; i += 4) {
    const dr = Math.abs(a.data[i] - b.data[i]);
    const dg = Math.abs(a.data[i + 1] - b.data[i + 1]);
    const db = Math.abs(a.data[i + 2] - b.data[i + 2]);
    if (dr > 5 || dg > 5 || db > 5) diffPixels++;
  }

  const diffPercent = (diffPixels / totalPixels) * 100;
  return { match: diffPercent < threshold, diffPercent };
}
