function extractPoints(stroke: string): number[][] {
  const nums = stroke.match(/-?\d+\.?\d*/g);
  if (!nums) return [];
  const pts: number[][] = [];
  for (let i = 0; i < nums.length; i += 2) {
    pts.push([parseFloat(nums[i]), parseFloat(nums[i + 1])]);
  }
  return pts;
}

function isDuplicate(pts1: number[][], pts2: number[][]): boolean {
  if (pts1.length === pts2.length && pts1.length > 0) {
    let totalDist = 0;
    for (let i = 0; i < pts1.length; i++) {
      const dx = pts2[i][0] - pts1[i][0];
      const dy = pts2[i][1] - pts1[i][1];
      totalDist += Math.sqrt(dx * dx + dy * dy);
    }
    if (totalDist / pts1.length <= 3) return true;
  }
  if (pts1.length > pts2.length && pts2.length >= 2) {
    const near = (p: number[], pts: number[][]) =>
      pts.some(q => Math.abs(q[0] - p[0]) <= 3 && Math.abs(q[1] - p[1]) <= 3);
    if (near(pts2[0], pts1) && near(pts2[pts2.length - 1], pts1)) return true;
  }
  return false;
}

export function simplifyToSingleStroke(path: string): string {
  const strokes = path.split(/(?=M)/).filter(s => s.trim());
  const keep: string[] = [];
  const skip = new Set<number>();

  for (let i = 0; i < strokes.length; i++) {
    if (skip.has(i)) continue;
    const ptsI = extractPoints(strokes[i]);

    // Remove short serif strokes (2 points, length < 4)
    if (ptsI.length === 2) {
      const dx = ptsI[1][0] - ptsI[0][0];
      const dy = ptsI[1][1] - ptsI[0][1];
      if (Math.sqrt(dx * dx + dy * dy) < 4) continue;
    }

    keep.push(strokes[i]);

    for (let j = i + 1; j < strokes.length && j <= i + 3; j++) {
      if (skip.has(j)) continue;
      const ptsJ = extractPoints(strokes[j]);
      if (isDuplicate(ptsI, ptsJ)) {
        skip.add(j);
      }
    }
  }
  return keep.join(' ');
}
