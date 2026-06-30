# Backlog / Roadmap

## Done (v1.0.x)

- [x] Core pipeline: docx → layout → effects → gcode
- [x] Single-stroke font (SlimamifLight, 172 glyphs, centerline-extracted)
- [x] Full Cyrillic (UA+RU) + Latin + digits + punctuation
- [x] Formatting: margins, indents, tabs, alignment, font size
- [x] Line spacing (single/1.5/double/exact/custom multiplier)
- [x] Character spacing (condensed/expanded)
- [x] Style defaults: docDefaults → Normal style → direct (OOXML-compliant)
- [x] Living handwriting effects (seeded PRNG)
- [x] Configurable G-code (Z-axis / servo presets, custom)
- [x] Multi-page with M0 pause
- [x] Web UI: drag-drop, SVG preview, settings, download
- [x] Single-file build (168KB HTML)
- [x] GitHub Pages deploy
- [x] CI/CD (typecheck, lint, format, build, 43 tests)
- [x] Open-source release (MIT, README UA/EN, CONTRIBUTING)

## Future ideas

- [ ] Bold/italic style support (separate font variants or transform)
- [ ] Numbered/bulleted lists
- [ ] Tables (basic grid)
- [ ] Headers/footers
- [ ] Custom font upload (user provides their own single-stroke JSON)
- [ ] Multiple font support in one document
- [ ] PDF input (alternative to docx)
- [ ] Preview: show pen-up travel paths (ghost lines)
- [ ] Estimate print time based on feed rate and path length
- [ ] Export to SVG (for laser cutters or vinyl plotters)
- [ ] Localization of UI (currently Ukrainian-only interface)
- [ ] PWA / offline install
