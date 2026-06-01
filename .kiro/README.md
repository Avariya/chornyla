# Plotter Handwriting — Project Context

## Що це

Client-side веб-додаток (TypeScript + Vite) для конвертації .docx → G-code для pen plotter.
Використовує одноштрихові (single-stroke) шрифти Hershey з підтримкою кирилиці.

## Workflow

```
Word/LibreOffice → .docx → [Браузер: парсинг + layout + effects] → .gcode → Плоттер
```

## Архітектура (data flow)

```
.docx файл
  ↓ JSZip + DOMParser
Document Model (page size, margins, paragraphs with formatting)
  ↓ + Font Data (Hershey Cyrillic, JSON)
Positioned Glyphs (char, x, y, scale, pathData)
  ↓ Handwriting Effects (seeded random offsets)
Transformed Glyphs
  ↓ SVG Path → G-code (Bezier flattening, pen up/down)
.gcode файл
```

## Ключові рішення

1. **Client-side only** — весь pipeline працює в браузері, не потрібен сервер
2. **Vite + vanilla TS** — мінімальний стек, без фреймворків
3. **Hershey fonts** — public domain одноштрихові шрифти з кирилицею
4. **DOCX як інструмент верстки** — користувач налаштовує відступи/таби в Word
5. **Конфігурований G-code** — пресети для різних типів плоттерів (Z-axis, servo)
6. **GRBL-сумісний вихід** — G00 Z0.300 / G01 Z-0.200 F5000, заголовок M03 S10000, футер M05+M30
7. **Visual regression тести** — Vitest + sharp, з перевіркою що зображення не порожнє

## Цільова аудиторія

Людина без технічного досвіду, яка має плоттер і хоче друкувати текст кирилицею "від руки".
