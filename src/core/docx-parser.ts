import JSZip from 'jszip';

export interface PageSettings {
  width: number;   // mm
  height: number;  // mm
  margins: { top: number; bottom: number; left: number; right: number };
}

export interface TabStop {
  pos: number; // mm from left margin
}

export interface ParagraphFormat {
  indent: { left: number; right: number; firstLine: number }; // mm
  tabs: TabStop[];
  alignment: 'left' | 'center' | 'right' | 'justify';
  spacing: { before: number; after: number; line: number }; // mm, mm, multiplier
}

export interface Run {
  text: string;
  fontSize: number; // pt
}

export interface Paragraph {
  runs: Run[];
  format: ParagraphFormat;
}

export interface Document {
  page: PageSettings;
  paragraphs: Paragraph[];
}

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

// Convert twips (1/20 pt = 1/1440 inch) to mm
function twipsToMm(twips: number): number {
  return twips * 25.4 / 1440;
}

// Convert EMU (English Metric Units, 1/914400 inch) to mm — used for page size
function emuToMm(emu: number): number {
  return emu * 25.4 / 914400;
}

function getAttr(el: Element, localName: string): string | null {
  return el.getAttributeNS(W, localName) || el.getAttribute(`w:${localName}`);
}

function child(el: Element, localName: string): Element | null {
  return el.getElementsByTagNameNS(W, localName)[0] ||
    el.querySelector(`${localName}, w\\:${localName}`) || null;
}

function parsePageSettings(sectPr: Element | null): PageSettings {
  const defaults: PageSettings = {
    width: 210, height: 297, // A4
    margins: { top: 25.4, bottom: 25.4, left: 31.7, right: 31.7 }
  };
  if (!sectPr) return defaults;

  const pgSz = child(sectPr, 'pgSz');
  if (pgSz) {
    const w = getAttr(pgSz, 'w');
    const h = getAttr(pgSz, 'h');
    if (w) defaults.width = twipsToMm(parseInt(w));
    if (h) defaults.height = twipsToMm(parseInt(h));
    const orient = getAttr(pgSz, 'orient');
    if (orient === 'landscape' && defaults.height > defaults.width) {
      [defaults.width, defaults.height] = [defaults.height, defaults.width];
    }
  }

  const pgMar = child(sectPr, 'pgMar');
  if (pgMar) {
    const t = getAttr(pgMar, 'top');
    const b = getAttr(pgMar, 'bottom');
    const l = getAttr(pgMar, 'left');
    const r = getAttr(pgMar, 'right');
    if (t) defaults.margins.top = twipsToMm(parseInt(t));
    if (b) defaults.margins.bottom = twipsToMm(parseInt(b));
    if (l) defaults.margins.left = twipsToMm(parseInt(l));
    if (r) defaults.margins.right = twipsToMm(parseInt(r));
  }

  return defaults;
}

function parseParagraphFormat(pPr: Element | null): ParagraphFormat {
  const fmt: ParagraphFormat = {
    indent: { left: 0, right: 0, firstLine: 0 },
    tabs: [],
    alignment: 'left',
    spacing: { before: 0, after: 0, line: 1 }
  };
  if (!pPr) return fmt;

  const ind = child(pPr, 'ind');
  if (ind) {
    const l = getAttr(ind, 'left') || getAttr(ind, 'start');
    const r = getAttr(ind, 'right') || getAttr(ind, 'end');
    const fl = getAttr(ind, 'firstLine');
    const hang = getAttr(ind, 'hanging');
    if (l) fmt.indent.left = twipsToMm(parseInt(l));
    if (r) fmt.indent.right = twipsToMm(parseInt(r));
    if (fl) fmt.indent.firstLine = twipsToMm(parseInt(fl));
    if (hang) fmt.indent.firstLine = -twipsToMm(parseInt(hang));
  }

  const tabs = child(pPr, 'tabs');
  if (tabs) {
    const tabEls = tabs.getElementsByTagNameNS(W, 'tab');
    for (let i = 0; i < tabEls.length; i++) {
      const pos = getAttr(tabEls[i], 'pos');
      if (pos) fmt.tabs.push({ pos: twipsToMm(parseInt(pos)) });
    }
  }

  const jc = child(pPr, 'jc');
  if (jc) {
    const val = getAttr(jc, 'val');
    if (val === 'center') fmt.alignment = 'center';
    else if (val === 'right' || val === 'end') fmt.alignment = 'right';
    else if (val === 'both' || val === 'distribute') fmt.alignment = 'justify';
  }

  const spacing = child(pPr, 'spacing');
  if (spacing) {
    const before = getAttr(spacing, 'before');
    const after = getAttr(spacing, 'after');
    const line = getAttr(spacing, 'line');
    const lineRule = getAttr(spacing, 'lineRule');
    if (before) fmt.spacing.before = twipsToMm(parseInt(before));
    if (after) fmt.spacing.after = twipsToMm(parseInt(after));
    if (line) {
      const lineVal = parseInt(line);
      if (lineRule === 'exact' || lineRule === 'atLeast') {
        fmt.spacing.line = twipsToMm(lineVal); // absolute mm value stored as negative
      } else {
        // Default: proportional (240 = single, 360 = 1.5, 480 = double)
        fmt.spacing.line = lineVal / 240;
      }
    }
  }

  return fmt;
}

function getRunFontSize(rPr: Element | null, defaultSize: number): number {
  if (!rPr) return defaultSize;
  const sz = child(rPr, 'sz');
  if (sz) {
    const val = getAttr(sz, 'val');
    if (val) return parseInt(val) / 2; // half-points → points
  }
  return defaultSize;
}

export async function parseDocx(data: ArrayBuffer): Promise<Document> {
  const zip = await JSZip.loadAsync(data);
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) throw new Error('Invalid .docx: missing word/document.xml');

  const parser = new DOMParser();
  const doc = parser.parseFromString(docXml, 'application/xml');

  // Page settings from last sectPr
  const sectPrs = doc.getElementsByTagNameNS(W, 'sectPr');
  const sectPr = sectPrs.length > 0 ? sectPrs[sectPrs.length - 1] : null;
  const page = parsePageSettings(sectPr);

  // Default font size from document defaults
  let defaultFontSize = 12;
  const docDefaults = doc.getElementsByTagNameNS(W, 'docDefaults')[0];
  if (docDefaults) {
    const rPrDefault = child(docDefaults, 'rPrDefault');
    if (rPrDefault) {
      const rPr = child(rPrDefault, 'rPr');
      defaultFontSize = getRunFontSize(rPr, 12);
    }
  }

  // Parse paragraphs
  const paragraphs: Paragraph[] = [];
  const bodyEl = doc.getElementsByTagNameNS(W, 'body')[0];
  if (!bodyEl) throw new Error('Invalid .docx: missing w:body');

  const pEls = bodyEl.getElementsByTagNameNS(W, 'p');
  for (let i = 0; i < pEls.length; i++) {
    const pEl = pEls[i];
    const pPr = child(pEl, 'pPr');
    const format = parseParagraphFormat(pPr);

    // Get paragraph-level font size
    let pFontSize = defaultFontSize;
    if (pPr) {
      const pRPr = child(pPr, 'rPr');
      pFontSize = getRunFontSize(pRPr, defaultFontSize);
    }

    const runs: Run[] = [];
    const children = pEl.childNodes;
    for (let j = 0; j < children.length; j++) {
      const node = children[j] as Element;
      if (!node.localName) continue;

      if (node.localName === 'r') {
        const rPr = child(node, 'rPr');
        const fontSize = getRunFontSize(rPr, pFontSize);
        // Collect text and tabs within this run
        const rChildren = node.childNodes;
        for (let k = 0; k < rChildren.length; k++) {
          const rChild = rChildren[k] as Element;
          if (!rChild.localName) continue;
          if (rChild.localName === 't') {
            const text = rChild.textContent || '';
            if (text) runs.push({ text, fontSize });
          } else if (rChild.localName === 'tab') {
            runs.push({ text: '\t', fontSize });
          } else if (rChild.localName === 'br') {
            runs.push({ text: '\n', fontSize });
          }
        }
      }
    }

    paragraphs.push({ runs, format });
  }

  return { page, paragraphs };
}
