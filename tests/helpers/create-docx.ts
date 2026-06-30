import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  TabStopType,
  convertMillimetersToTwip,
  LineRuleType,
  PageOrientation,
} from 'docx';

async function make(
  children: Paragraph[],
  pageSize?: {
    width: number;
    height: number;
    orientation?: (typeof PageOrientation)[keyof typeof PageOrientation];
  },
  margins?: { top?: number; bottom?: number; left?: number; right?: number }
): Promise<ArrayBuffer> {
  const section: any = { children };
  const page: any = {};
  if (pageSize)
    page.size = {
      width: pageSize.width,
      height: pageSize.height,
      orientation: pageSize.orientation,
    };
  if (margins)
    page.margin = {
      top: margins.top !== undefined ? convertMillimetersToTwip(margins.top) : undefined,
      bottom: margins.bottom !== undefined ? convertMillimetersToTwip(margins.bottom) : undefined,
      left: margins.left !== undefined ? convertMillimetersToTwip(margins.left) : undefined,
      right: margins.right !== undefined ? convertMillimetersToTwip(margins.right) : undefined,
    };
  if (pageSize || margins) section.properties = { page };
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: { name: 'Slimamif Light' }, size: 24 },
        },
      },
    },
    sections: [section],
  });
  const buf = await Packer.toBuffer(doc);
  return new Uint8Array(buf).buffer;
}

export async function basicText(): Promise<ArrayBuffer> {
  return make([new Paragraph({ children: [new TextRun('Привіт світ! Hello World 123')] })]);
}

export async function indentFirstLine(): Promise<ArrayBuffer> {
  return make([
    new Paragraph({
      indent: { firstLine: convertMillimetersToTwip(12.5) },
      children: [
        new TextRun(
          'Перший рядок з відступом першого рядка має бути довшим щоб перенестись на другий рядок. Другий рядок тексту продовжується далі без відступу, бо відступ лише у першого рядка параграфу.'
        ),
      ],
    }),
  ]);
}

export async function indentLeft(): Promise<ArrayBuffer> {
  return make([
    new Paragraph({
      indent: { left: convertMillimetersToTwip(20) },
      children: [new TextRun('Текст з лівим відступом 2 см')],
    }),
  ]);
}

export async function tabStops(): Promise<ArrayBuffer> {
  return make([
    new Paragraph({
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
    }),
  ]);
}

export async function alignCenter(): Promise<ArrayBuffer> {
  return make([
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun('Центрований текст')],
    }),
  ]);
}

export async function alignRight(): Promise<ArrayBuffer> {
  return make([
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun('Текст праворуч')],
    }),
  ]);
}

export async function fontSizeLarge(): Promise<ArrayBuffer> {
  return make([
    new Paragraph({
      children: [new TextRun({ text: 'Великий шрифт 24pt', size: 48 })], // size in half-points
    }),
  ]);
}

export async function lineSpacingDouble(): Promise<ArrayBuffer> {
  return make([
    new Paragraph({
      spacing: { line: 480, lineRule: LineRuleType.AUTO },
      children: [
        new TextRun(
          'Перший рядок з подвійним інтервалом має бути довшим щоб показати перенос. Другий рядок тексту продовжується далі і також має бути достатньо довгим. Третій рядок для перевірки міжрядкового інтервалу має чітко показувати подвійну відстань між рядками тексту.'
        ),
      ],
    }),
  ]);
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
    new Paragraph({
      children: [new TextRun('АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя')],
    }),
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
    {
      width: convertMillimetersToTwip(297),
      height: convertMillimetersToTwip(210),
      orientation: PageOrientation.LANDSCAPE,
    }
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
  return make([new Paragraph({ children: [new TextRun('A3 альбомний. Найширший формат.')] })], {
    width: convertMillimetersToTwip(420),
    height: convertMillimetersToTwip(297),
    orientation: PageOrientation.LANDSCAPE,
  });
}

export async function ukrainianLetters(): Promise<ArrayBuffer> {
  return make([new Paragraph({ children: [new TextRun('Їжак єнот ґанок різдво їжачок')] })]);
}

export async function italicText(): Promise<ArrayBuffer> {
  return make([new Paragraph({ children: [new TextRun('Курсив italic 123')] })]);
}

export async function simplifiedAlphabet(): Promise<ArrayBuffer> {
  return make([
    new Paragraph({
      children: [new TextRun({ text: 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ', size: 36 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: 'абвгдежзийклмнопрстуфхцчшщъыьэюя', size: 36 })],
    }),
    new Paragraph({ children: [new TextRun({ text: 'ҐЄІЇґєії', size: 36 })] }),
    new Paragraph({ children: [new TextRun({ text: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', size: 36 })] }),
    new Paragraph({ children: [new TextRun({ text: 'abcdefghijklmnopqrstuvwxyz', size: 36 })] }),
    new Paragraph({ children: [new TextRun({ text: '0123456789 .,!?:;-—()/', size: 36 })] }),
  ]);
}

// Ukrainian text with all letters + full alphabet display
export async function pangramPrint(): Promise<ArrayBuffer> {
  return make([
    new Paragraph({
      children: [new TextRun({ text: "Щастя та здоров'я бажаю вам, друзі!", size: 32 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Жінці Юрка Ґедзя ще й їжачків подарували.', size: 32 })],
    }),
    new Paragraph({ children: [new TextRun({ text: "Фахівець Чіпка шукає об'єкти.", size: 32 })] }),
    new Paragraph({ children: [new TextRun({ text: '', size: 16 })] }),
    new Paragraph({
      children: [new TextRun({ text: 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ', size: 32 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: 'абвгдежзийклмнопрстуфхцчшщъыьэюя', size: 32 })],
    }),
    new Paragraph({ children: [new TextRun({ text: 'ҐЄІЇґєії', size: 32 })] }),
    new Paragraph({
      children: [
        new TextRun({ text: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', size: 32 }),
      ],
    }),
    new Paragraph({ children: [new TextRun({ text: '0123456789.,!?:;-—()/«» №', size: 32 })] }),
  ]);
}

export async function pangramItalic(): Promise<ArrayBuffer> {
  return make([
    new Paragraph({
      children: [new TextRun({ text: "Щастя та здоров'я бажаю вам, друзі!", size: 32 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Жінці Юрка Ґедзя ще й їжачків подарували.', size: 32 })],
    }),
    new Paragraph({ children: [new TextRun({ text: "Фахівець Чіпка шукає об'єкти.", size: 32 })] }),
    new Paragraph({ children: [new TextRun({ text: '', size: 16 })] }),
    new Paragraph({
      children: [new TextRun({ text: 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ', size: 32 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: 'абвгдежзийклмнопрстуфхцчшщъыьэюя', size: 32 })],
    }),
    new Paragraph({ children: [new TextRun({ text: 'ҐЄІЇґєії', size: 32 })] }),
    new Paragraph({
      children: [
        new TextRun({ text: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', size: 32 }),
      ],
    }),
    new Paragraph({ children: [new TextRun({ text: '0123456789.,!?:;-—()/«» №', size: 32 })] }),
  ]);
}

export async function topAndBottom(): Promise<ArrayBuffer> {
  const emptyLines: Paragraph[] = [];
  for (let i = 0; i < 35; i++) {
    emptyLines.push(new Paragraph({ children: [new TextRun('')] }));
  }
  return make([
    new Paragraph({ children: [new TextRun('Текст зверху сторінки')] }),
    ...emptyLines,
    new Paragraph({ children: [new TextRun('Текст знизу сторінки')] }),
  ]);
}

export async function mixedFontSize(): Promise<ArrayBuffer> {
  return make([
    new Paragraph({
      children: [
        new TextRun({ text: 'Малий ', size: 20 }),
        new TextRun({ text: 'Середній ', size: 28 }),
        new TextRun({ text: 'Великий ', size: 40 }),
        new TextRun({ text: 'Малий', size: 20 }),
      ],
    }),
  ]);
}

export async function zapovit(): Promise<ArrayBuffer> {
  const lines = [
    'Як умру, то поховайте',
    'Мене на могилі',
    'Серед степу широкого',
    'На Вкраїні милій,',
    'Щоб лани широкополі,',
    'І Дніпро, і кручі',
    'Було видно, було чути,',
    'Як реве ревучий.',
    '',
    'Як понесе з України',
    'У синєє море',
    'Кров ворожу... отойді я',
    'І лани і гори —',
    'Все покину, і полину',
    'До самого Бога',
    'Молитися... а до того',
    'Я не знаю Бога.',
    '',
    'Поховайте та вставайте,',
    'Кайдани порвіте',
    "І вражою злою кров'ю",
    'Волю окропіте.',
    "І мене в сем'ї великій,",
    "В сем'ї вольній, новій,",
    "Не забудьте пом'янути",
    'Незлим тихим словом.',
  ];
  return make(lines.map((l) => new Paragraph({ children: [new TextRun(l)] })));
}

export async function fullPage(): Promise<ArrayBuffer> {
  return make([new Paragraph({ children: [new TextRun('а'.repeat(5000))] })]);
}

export async function fullPageLargeMargins(): Promise<ArrayBuffer> {
  return make([new Paragraph({ children: [new TextRun('а'.repeat(5000))] })], undefined, {
    top: 50,
    bottom: 40,
    left: 45,
    right: 35,
  });
}

export async function fullPageSmallMargins(): Promise<ArrayBuffer> {
  return make([new Paragraph({ children: [new TextRun('а'.repeat(7000))] })], undefined, {
    top: 8,
    bottom: 12,
    left: 10,
    right: 15,
  });
}

export async function fullPageZeroMargins(): Promise<ArrayBuffer> {
  return make([new Paragraph({ children: [new TextRun('а'.repeat(7000))] })], undefined, {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });
}

export async function alignJustify(): Promise<ArrayBuffer> {
  return make([
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun(
          'Цей текст вирівняний по ширині і має бути достатньо довгим щоб зайняти кілька рядків для перевірки роботи justify вирівнювання у документі'
        ),
      ],
    }),
  ]);
}

export async function indentRight(): Promise<ArrayBuffer> {
  return make([
    new Paragraph({
      indent: { right: convertMillimetersToTwip(30) },
      children: [
        new TextRun('Текст з правим відступом 3 см має переноситись раніше ніж звичайний текст'),
      ],
    }),
  ]);
}

export async function multiPage(): Promise<ArrayBuffer> {
  return make([new Paragraph({ children: [new TextRun('а'.repeat(10000))] })]);
}

export async function guillemets(): Promise<ArrayBuffer> {
  return make([new Paragraph({ children: [new TextRun('«Привіт» — „світ" і "ще"')] })]);
}
