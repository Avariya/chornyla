import { Document, Packer, Paragraph, TextRun, AlignmentType, TabStopType, convertMillimetersToTwip, LineRuleType, PageOrientation } from 'docx';

async function make(children: Paragraph[], pageSize?: { width: number; height: number; orientation?: typeof PageOrientation[keyof typeof PageOrientation] }): Promise<ArrayBuffer> {
  const section: any = { children };
  if (pageSize) {
    section.properties = {
      page: { size: { width: pageSize.width, height: pageSize.height, orientation: pageSize.orientation } }
    };
  }
  const doc = new Document({ sections: [section] });
  const buf = await Packer.toBuffer(doc);
  return new Uint8Array(buf).buffer;
}

export async function basicText(): Promise<ArrayBuffer> {
  return make([new Paragraph({ children: [new TextRun('Привіт світ! Hello World 123')] })]);
}

export async function indentFirstLine(): Promise<ArrayBuffer> {
  return make([new Paragraph({
    indent: { firstLine: convertMillimetersToTwip(12.5) },
    children: [new TextRun('Перший рядок з відступом. Другий рядок тексту продовжується далі.')],
  })]);
}

export async function indentLeft(): Promise<ArrayBuffer> {
  return make([new Paragraph({
    indent: { left: convertMillimetersToTwip(20) },
    children: [new TextRun('Текст з лівим відступом 2 см')],
  })]);
}

export async function tabStops(): Promise<ArrayBuffer> {
  return make([new Paragraph({
    tabStops: [
      { type: TabStopType.LEFT, position: convertMillimetersToTwip(30) },
      { type: TabStopType.LEFT, position: convertMillimetersToTwip(60) },
    ],
    children: [
      new TextRun('Колонка1'),
      new TextRun({ children: ['\t'] }),
      new TextRun('Колонка2'),
      new TextRun({ children: ['\t'] }),
      new TextRun('Колонка3'),
    ],
  })]);
}

export async function alignCenter(): Promise<ArrayBuffer> {
  return make([new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun('Центрований текст')],
  })]);
}

export async function alignRight(): Promise<ArrayBuffer> {
  return make([new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [new TextRun('Текст праворуч')],
  })]);
}

export async function fontSizeLarge(): Promise<ArrayBuffer> {
  return make([new Paragraph({
    children: [new TextRun({ text: 'Великий шрифт 24pt', size: 48 })], // size in half-points
  })]);
}

export async function lineSpacingDouble(): Promise<ArrayBuffer> {
  return make([new Paragraph({
    spacing: { line: 480, lineRule: LineRuleType.AUTO },
    children: [new TextRun('Перший рядок з подвійним інтервалом. Другий рядок тексту продовжується далі. Третій рядок для перевірки міжрядкового інтервалу.')],
  })]);
}

export async function multiParagraph(): Promise<ArrayBuffer> {
  return make([
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun('Перший абзац тексту.')] }),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun('Другий абзац тексту.')] }),
    new Paragraph({ children: [new TextRun('Третій абзац тексту.')] }),
  ]);
}

export async function cyrillicFull(): Promise<ArrayBuffer> {
  return make([
    new Paragraph({ children: [new TextRun('АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя')] }),
    new Paragraph({ children: [new TextRun('ҐЄІЇґєії')] }),
  ]);
}

export async function specialChars(): Promise<ArrayBuffer> {
  return make([new Paragraph({ children: [new TextRun('0123456789.,!?:;-()/')] })]);
}

// A4 landscape (297×210mm) — width/height in twips: 1mm = 56.7 twips
export async function pageA4Landscape(): Promise<ArrayBuffer> {
  return make(
    [new Paragraph({ children: [new TextRun('A4 альбомний. Текст на широкому аркуші.')] })],
    { width: convertMillimetersToTwip(297), height: convertMillimetersToTwip(210), orientation: PageOrientation.LANDSCAPE }
  );
}

// A3 portrait (297×420mm)
export async function pageA3Portrait(): Promise<ArrayBuffer> {
  return make(
    [new Paragraph({ children: [new TextRun('A3 портретний. Великий аркуш паперу.')] })],
    { width: convertMillimetersToTwip(297), height: convertMillimetersToTwip(420) }
  );
}

// A3 landscape (420×297mm)
export async function pageA3Landscape(): Promise<ArrayBuffer> {
  return make(
    [new Paragraph({ children: [new TextRun('A3 альбомний. Найширший формат.')] })],
    { width: convertMillimetersToTwip(420), height: convertMillimetersToTwip(297), orientation: PageOrientation.LANDSCAPE }
  );
}

export async function ukrainianLetters(): Promise<ArrayBuffer> {
  return make([new Paragraph({ children: [new TextRun('Їжак єнот ґанок різдво їжачок')] })]);
}

export async function italicText(): Promise<ArrayBuffer> {
  return make([new Paragraph({ children: [new TextRun('Курсив italic 123')] })]);
}

export async function simplifiedAlphabet(): Promise<ArrayBuffer> {
  return make([
    new Paragraph({ children: [new TextRun({ text: 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ', size: 36 })] }),
    new Paragraph({ children: [new TextRun({ text: 'абвгдежзийклмнопрстуфхцчшщъыьэюя', size: 36 })] }),
    new Paragraph({ children: [new TextRun({ text: 'ҐЄІЇґєії', size: 36 })] }),
    new Paragraph({ children: [new TextRun({ text: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', size: 36 })] }),
    new Paragraph({ children: [new TextRun({ text: 'abcdefghijklmnopqrstuvwxyz', size: 36 })] }),
    new Paragraph({ children: [new TextRun({ text: '0123456789 .,!?:;-—()/', size: 36 })] }),
  ]);
}

// Ukrainian text with all letters + full alphabet display
export async function pangramPrint(): Promise<ArrayBuffer> {
  return make([
    new Paragraph({ children: [new TextRun({ text: 'Щастя та здоров\'я бажаю вам, друзі!', size: 32 })] }),
    new Paragraph({ children: [new TextRun({ text: 'Жінці Юрка Ґедзя ще й їжачків подарували.', size: 32 })] }),
    new Paragraph({ children: [new TextRun({ text: 'Фахівець Чіпка шукає об\'єкти.', size: 32 })] }),
    new Paragraph({ children: [new TextRun({ text: '', size: 16 })] }),
    new Paragraph({ children: [new TextRun({ text: 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ', size: 32 })] }),
    new Paragraph({ children: [new TextRun({ text: 'абвгдежзийклмнопрстуфхцчшщъыьэюя', size: 32 })] }),
    new Paragraph({ children: [new TextRun({ text: 'ҐЄІЇґєії', size: 32 })] }),
    new Paragraph({ children: [new TextRun({ text: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', size: 32 })] }),
    new Paragraph({ children: [new TextRun({ text: '0123456789.,!?:;-—()/«»', size: 32 })] }),
  ]);
}

export async function pangramItalic(): Promise<ArrayBuffer> {
  return make([
    new Paragraph({ children: [new TextRun({ text: 'Щастя та здоров\'я бажаю вам, друзі!', size: 32 })] }),
    new Paragraph({ children: [new TextRun({ text: 'Жінці Юрка Ґедзя ще й їжачків подарували.', size: 32 })] }),
    new Paragraph({ children: [new TextRun({ text: 'Фахівець Чіпка шукає об\'єкти.', size: 32 })] }),
    new Paragraph({ children: [new TextRun({ text: '', size: 16 })] }),
    new Paragraph({ children: [new TextRun({ text: 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ', size: 32 })] }),
    new Paragraph({ children: [new TextRun({ text: 'абвгдежзийклмнопрстуфхцчшщъыьэюя', size: 32 })] }),
    new Paragraph({ children: [new TextRun({ text: 'ҐЄІЇґєії', size: 32 })] }),
    new Paragraph({ children: [new TextRun({ text: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', size: 32 })] }),
    new Paragraph({ children: [new TextRun({ text: '0123456789.,!?:;-—()/«»', size: 32 })] }),
  ]);
}

export async function topAndBottom(): Promise<ArrayBuffer> {
  const emptyLines: Paragraph[] = [];
  for (let i = 0; i < 40; i++) {
    emptyLines.push(new Paragraph({ children: [new TextRun('')] }));
  }
  return make([
    new Paragraph({ children: [new TextRun('Текст зверху сторінки')] }),
    ...emptyLines,
    new Paragraph({ children: [new TextRun('Текст знизу сторінки')] }),
  ]);
}
