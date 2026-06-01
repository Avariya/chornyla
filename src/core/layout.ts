import { Document, Paragraph, ParagraphFormat } from './docx-parser';
import { getGlyph, FONT_UNITS_PER_EM, FONT_CAP_HEIGHT } from './font';

export interface PositionedGlyph {
  char: string;
  x: number;      // mm
  y: number;      // mm (top of glyph)
  scale: number;  // font units → mm multiplier
  pathData: string;
}

export interface Page {
  glyphs: PositionedGlyph[];
  width: number;
  height: number;
}

// Convert font size (pt) to scale factor (font units → mm)
function fontScale(fontSize: number): number {
  // fontSize in pt, 1pt = 0.3528mm
  // We want cap height to equal ~fontSize in mm-equivalent
  return (fontSize * 0.3528) / FONT_CAP_HEIGHT;
}

// Default tab stops every 12.7mm (0.5 inch) if none specified
const DEFAULT_TAB_INTERVAL = 12.7;

function nextTabStop(x: number, tabs: number[], leftMargin: number): number {
  const relX = x - leftMargin;
  // Check explicit tab stops first
  for (const t of tabs) {
    if (t > relX + 0.1) return leftMargin + t;
  }
  // Default tab stops
  const interval = DEFAULT_TAB_INTERVAL;
  return leftMargin + Math.ceil((relX + 0.1) / interval) * interval;
}

interface LayoutLine {
  glyphs: PositionedGlyph[];
  width: number; // actual content width
  spaceCount: number; // for justify
}

export function layoutDocument(doc: Document): Page[] {
  const { page, paragraphs } = doc;
  const contentLeft = page.margins.left;
  const contentRight = page.width - page.margins.right;
  const contentTop = page.margins.top;
  const contentBottom = page.height - page.margins.bottom;

  const pages: Page[] = [];
  let currentGlyphs: PositionedGlyph[] = [];
  let y = contentTop;

  function newPage() {
    if (currentGlyphs.length > 0) {
      pages.push({ glyphs: currentGlyphs, width: page.width, height: page.height });
    }
    currentGlyphs = [];
    y = contentTop;
  }

  for (const para of paragraphs) {
    const lines = layoutParagraph(para, page.margins.left, contentLeft, contentRight);
    const fmt = para.format;
    const fontSize = para.runs[0]?.fontSize || 12;
    const lineHeight = getLineHeight(fontSize, fmt.spacing.line);

    // Space before paragraph
    y += fmt.spacing.before;

    // Empty paragraph still takes one line of vertical space
    if (lines.length === 0) {
      if (y + lineHeight > contentBottom) {
        newPage();
      }
      y += lineHeight;
    }

    for (const line of lines) {
      if (y + lineHeight > contentBottom) {
        newPage();
      }

      // Apply alignment offset
      const maxWidth = contentRight - contentLeft - fmt.indent.left - fmt.indent.right;
      let offsetX = 0;
      if (fmt.alignment === 'center') {
        offsetX = (maxWidth - line.width) / 2;
      } else if (fmt.alignment === 'right') {
        offsetX = maxWidth - line.width;
      }

      // Position glyphs on this line
      for (const g of line.glyphs) {
        currentGlyphs.push({
          ...g,
          x: g.x + offsetX,
          y: y
        });
      }

      // Justify: distribute extra space between words
      if (fmt.alignment === 'justify' && line.spaceCount > 0 && line.width < maxWidth * 0.85) {
        // Don't justify very short lines (last line of paragraph)
      } else if (fmt.alignment === 'justify' && line.spaceCount > 0) {
        const extraSpace = (maxWidth - line.width) / line.spaceCount;
        let spacesSeen = 0;
        for (const g of line.glyphs) {
          const idx = currentGlyphs.indexOf(g);
          if (idx === -1) continue;
          if (g.char === ' ') spacesSeen++;
          // Shift all glyphs after each space
          const found = currentGlyphs.findIndex(cg => cg === g);
          if (found >= 0) currentGlyphs[found].x += spacesSeen * extraSpace;
        }
      }

      y += lineHeight;
    }

    // Space after paragraph
    y += fmt.spacing.after;
  }

  // Push last page
  if (currentGlyphs.length > 0) {
    pages.push({ glyphs: currentGlyphs, width: page.width, height: page.height });
  }

  return pages;
}

function getLineHeight(fontSize: number, lineSpacing: number): number {
  const baseHeight = fontSize * 0.3528 * 1.2; // pt → mm with 20% leading
  if (lineSpacing > 10) {
    // Absolute value in mm (from exact/atLeast rule)
    return lineSpacing;
  }
  return baseHeight * lineSpacing;
}

function layoutParagraph(
  para: Paragraph,
  _marginLeft: number,
  contentLeft: number,
  contentRight: number
): LayoutLine[] {
  const fmt = para.format;
  const maxWidth = contentRight - contentLeft - fmt.indent.left - fmt.indent.right;
  const lines: LayoutLine[] = [];

  let x = fmt.indent.firstLine; // first line indent
  let lineGlyphs: PositionedGlyph[] = [];
  let lineWidth = 0;
  let spaceCount = 0;
  let isFirstLine = true;
  let wordStart = 0; // index in lineGlyphs where current word starts

  function pushLine() {
    lines.push({ glyphs: lineGlyphs, width: lineWidth, spaceCount });
    lineGlyphs = [];
    lineWidth = 0;
    spaceCount = 0;
    x = 0; // subsequent lines have no firstLine indent
    isFirstLine = false;
    wordStart = 0;
  }

  for (const run of para.runs) {
    const scale = fontScale(run.fontSize);

    for (const char of run.text) {
      if (char === '\n') {
        pushLine();
        continue;
      }

      if (char === '\t') {
        const tabX = nextTabStop(
          contentLeft + fmt.indent.left + x,
          fmt.tabs.map(t => t.pos),
          contentLeft
        );
        x = tabX - contentLeft - fmt.indent.left;
        lineWidth = x;
        continue;
      }

      const glyph = getGlyph(char);
      if (!glyph) continue;

      const charWidth = glyph.width * scale;

      // Word wrap
      if (x + charWidth > maxWidth && lineGlyphs.length > 0) {
        // Try to break at last space
        if (char !== ' ' && wordStart > 0) {
          // Move current word to next line
          const overflow = lineGlyphs.splice(wordStart);
          lineWidth = wordStart > 0 ? lineGlyphs[wordStart - 1]?.x 
            ? (lineGlyphs[lineGlyphs.length - 1]?.x || 0) + 
              (getGlyph(lineGlyphs[lineGlyphs.length - 1]?.char || '')?.width || 0) * scale - 
              (contentLeft + fmt.indent.left)
            : 0 : 0;
          // Recalculate line width
          if (lineGlyphs.length > 0) {
            const last = lineGlyphs[lineGlyphs.length - 1];
            const lastGlyph = getGlyph(last.char);
            lineWidth = last.x - contentLeft - fmt.indent.left + (lastGlyph?.width || 0) * last.scale;
          } else {
            lineWidth = 0;
          }
          spaceCount = lineGlyphs.filter(g => g.char === ' ').length;
          pushLine();
          // Re-add overflow glyphs
          for (const og of overflow) {
            const ogGlyph = getGlyph(og.char);
            if (!ogGlyph) continue;
            const ogWidth = ogGlyph.width * og.scale;
            lineGlyphs.push({
              char: og.char,
              x: contentLeft + fmt.indent.left + x,
              y: 0,
              scale: og.scale,
              pathData: ogGlyph.path
            });
            x += ogWidth;
          }
          lineWidth = x;
          wordStart = 0;
        } else {
          pushLine();
        }
      }

      if (char === ' ') {
        spaceCount++;
        wordStart = lineGlyphs.length + 1;
      }

      lineGlyphs.push({
        char,
        x: contentLeft + fmt.indent.left + x,
        y: 0, // will be set when line is placed
        scale,
        pathData: glyph.path
      });
      x += charWidth;
      lineWidth = x;
    }
  }

  // Push remaining line
  if (lineGlyphs.length > 0) {
    lines.push({ glyphs: lineGlyphs, width: lineWidth, spaceCount });
  }

  return lines;
}
