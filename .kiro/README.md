# Plotter Handwriting — Project Context

## Що це

Client-side веб-додаток (TypeScript + Vite) для конвертації .docx → G-code для pen plotter.
Використовує одноштрихові (single-stroke) шрифти з підтримкою кирилиці.

## Workflow

```
Word/LibreOffice → .docx → [Браузер: парсинг + layout + effects] → .gcode → Плоттер
```

Важливо: документ у Word має використовувати шрифт **Slimamif Light** для точного збігу
розмірів тексту між Word preview та plotter output.

## Архітектура (data flow)

```
.docx файл
  ↓ JSZip + DOMParser
Document Model (page size, margins, orientation, paragraphs with formatting)
  ↓ + Font Data (SlimamifLight, centerline-extracted JSON)
Positioned Glyphs (char, x, y, scale, pathData) — baseline-aligned
  ↓ Handwriting Effects (seeded random offsets)
Transformed Glyphs
  ↓ SVG Path → G-code (line segments, pen up/down)
.gcode файл (GRBL-compatible)
```

## Ключові рішення

1. **Client-side only** — весь pipeline працює в браузері, не потрібен сервер
2. **Vite + vanilla TS** — мінімальний стек, без фреймворків
3. **SlimamifLight** — рукописний OTF шрифт, centerline-extracted для single-stroke
4. **DOCX як інструмент верстки** — користувач налаштовує відступи/таби в Word
5. **Конфігурований G-code** — пресети для різних типів плоттерів (Z-axis, servo)
6. **GRBL-сумісний вихід** — G00 Z0.300 / G01 Z-0.200 F5000, M03/M05, M30
7. **Точні розміри** — ширини та висоти гліфів точно відповідають Word rendering
8. **Visual regression тести** — 22 тести, Vitest + sharp, non-blank assertion

## Точність розмірів (перевірено)

- Advance widths: збіг з OTF hmtx (0.07% відхилення від округлення)
- Line height: 5.93mm vs Word 5.94mm (single spacing, 12pt)
- Chars per line: 207 на A3 landscape (збіг з Word)
- Baseline alignment: працює для mixed font sizes

## Тестування

```bash
npm test                    # запуск тестів
UPDATE_SNAPSHOTS=1 npm test # оновити еталони після навмисних змін
```

Тести перевіряють:
- Базовий текст, відступи, табуляція, вирівнювання
- Різні розміри шрифту (включно з mixed на одному рядку)
- Кирилиця, латиниця, спецсимволи
- Landscape/portrait A4/A3
- Вірш "Заповіт" (багато рядків)
- Non-blank assertion (зображення не може бути порожнім)

## Цільова аудиторія

Людина без технічного досвіду, яка має плоттер і хоче друкувати текст кирилицею "від руки".
