import { convert, ConvertConfig, DEFAULT_CONFIG, PRESETS, Page } from '../core/pipeline';

let currentConfig: ConvertConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
let currentPages: Page[] = [];
let currentGcode = '';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; }
  #app { max-width: 1200px; margin: 0 auto; padding: 20px; }
  h1 { font-size: 1.5rem; margin-bottom: 4px; }
  .subtitle { color: #666; margin-bottom: 20px; font-size: 0.9rem; }
  .layout { display: grid; grid-template-columns: 1fr 280px; gap: 20px; }
  @media (max-width: 800px) { .layout { grid-template-columns: 1fr; } }
  .panel { background: #fff; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .drop-zone { border: 2px dashed #ccc; border-radius: 8px; padding: 40px; text-align: center; cursor: pointer; transition: border-color 0.2s; }
  .drop-zone:hover, .drop-zone.dragover { border-color: #4a90d9; background: #f0f7ff; }
  .drop-zone input { display: none; }
  .preview-container { position: relative; overflow: auto; background: #e8e8e8; border-radius: 4px; margin-top: 12px; max-height: 500px; }
  .preview-container svg { display: block; margin: 0 auto; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
  .settings label { display: block; margin: 10px 0 4px; font-size: 0.85rem; font-weight: 500; }
  .settings select, .settings input[type=number] { width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem; }
  .settings input[type=range] { width: 100%; }
  .btn { display: block; width: 100%; padding: 12px; margin-top: 16px; background: #4a90d9; color: white; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer; font-weight: 500; }
  .btn:hover { background: #357abd; }
  .btn:disabled { background: #ccc; cursor: not-allowed; }
  .warnings { margin-top: 12px; padding: 8px; background: #fff3cd; border-radius: 4px; font-size: 0.8rem; display: none; }
  .status { margin-top: 8px; font-size: 0.85rem; color: #666; }
  .range-val { float: right; font-weight: normal; color: #666; }
</style>
<h1>✍️ Plotter Handwriting</h1>
<p class="subtitle">DOCX → G-code для плоттера</p>
<div class="layout">
  <div class="main-col">
    <div class="panel">
      <div class="drop-zone" id="dropZone">
        <p>📄 Перетягніть .docx файл сюди</p>
        <p style="margin-top:8px;color:#999;font-size:0.85rem">або натисніть для вибору</p>
        <input type="file" id="fileInput" accept=".docx">
      </div>
      <div class="status" id="status"></div>
      <div class="preview-container" id="previewContainer"></div>
      <div class="warnings" id="warnings"></div>
    </div>
  </div>
  <div class="settings-col">
    <div class="panel settings">
      <h3 style="margin-bottom:8px">⚙️ Налаштування</h3>
      <label>Пресет плоттера</label>
      <select id="preset">
        <option value="zAxis">GRBL Z-axis (G0 Z)</option>
        <option value="servo">GRBL Servo (M3 S)</option>
        <option value="custom">Custom</option>
      </select>
      <label>Pen Up команда</label>
      <input type="text" id="penUp" value="G00 Z0.300" style="width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:4px;font-size:0.9rem">
      <label>Pen Down команда</label>
      <input type="text" id="penDown" value="G01 Z-0.200 F5000" style="width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:4px;font-size:0.9rem">
      <label>Швидкість малювання (мм/хв)</label>
      <input type="number" id="feedRate" value="5000" min="100" max="10000" step="100">
      <label>Швидкість переміщення (мм/хв)</label>
      <input type="number" id="travelRate" value="5000" min="100" max="20000" step="100">
      <label>Ефекти рукопису <span class="range-val" id="intensityVal">50%</span></label>
      <input type="range" id="intensity" min="0" max="100" value="50">
      <label>Стиль шрифту</label>
      <select id="fontStyle">
        <option value="print">Друкований</option>
        <option value="italic">Курсив (italic)</option>
      </select>
      <label>Seed (для повторюваності)</label>
      <input type="number" id="seed" value="42" min="0" max="9999">
      <button class="btn" id="downloadBtn" disabled>📥 Завантажити G-code</button>
    </div>
  </div>
</div>
`;

// Elements
const dropZone = document.getElementById('dropZone')!;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const status = document.getElementById('status')!;
const previewContainer = document.getElementById('previewContainer')!;
const warnings = document.getElementById('warnings')!;
const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
const presetSelect = document.getElementById('preset') as HTMLSelectElement;
const feedRateInput = document.getElementById('feedRate') as HTMLInputElement;
const travelRateInput = document.getElementById('travelRate') as HTMLInputElement;
const intensityInput = document.getElementById('intensity') as HTMLInputElement;
const intensityVal = document.getElementById('intensityVal')!;
const seedInput = document.getElementById('seed') as HTMLInputElement;
const penUpInput = document.getElementById('penUp') as HTMLInputElement;
const penDownInput = document.getElementById('penDown') as HTMLInputElement;
const fontStyleSelect = document.getElementById('fontStyle') as HTMLSelectElement;

// Load saved settings
const saved = localStorage.getItem('plotter-settings');
if (saved) {
  try {
    const s = JSON.parse(saved);
    if (s.preset) presetSelect.value = s.preset;
    if (s.feedRate) feedRateInput.value = s.feedRate;
    if (s.travelRate) travelRateInput.value = s.travelRate;
    if (s.intensity !== undefined) intensityInput.value = s.intensity;
    if (s.seed) seedInput.value = s.seed;
    if (s.penUp) penUpInput.value = s.penUp;
    if (s.penDown) penDownInput.value = s.penDown;
    if (s.fontStyle) fontStyleSelect.value = s.fontStyle;
    intensityVal.textContent = intensityInput.value + '%';
  } catch {}
}

function saveSettings() {
  localStorage.setItem('plotter-settings', JSON.stringify({
    preset: presetSelect.value,
    feedRate: feedRateInput.value,
    travelRate: travelRateInput.value,
    intensity: intensityInput.value,
    seed: seedInput.value,
    penUp: penUpInput.value,
    penDown: penDownInput.value,
    fontStyle: fontStyleSelect.value
  }));
}

// Drag & drop
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer?.files[0];
  if (file && file.name.endsWith('.docx')) processFile(file);
});
fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) processFile(file);
});

// Settings
presetSelect.addEventListener('change', () => { updateConfig(); reconvert(); });
feedRateInput.addEventListener('change', () => { updateConfig(); reconvert(); });
travelRateInput.addEventListener('change', () => { updateConfig(); reconvert(); });
penUpInput.addEventListener('change', () => { presetSelect.value = 'custom'; updateConfig(); reconvert(); });
penDownInput.addEventListener('change', () => { presetSelect.value = 'custom'; updateConfig(); reconvert(); });
intensityInput.addEventListener('input', () => {
  intensityVal.textContent = intensityInput.value + '%';
  updateConfig();
  reconvert();
});
seedInput.addEventListener('change', () => { updateConfig(); reconvert(); });
fontStyleSelect.addEventListener('change', () => { updateConfig(); reconvert(); });

function updateConfig() {
  const preset = presetSelect.value as keyof typeof PRESETS;
  const base = PRESETS[preset] || PRESETS.zAxis;
  currentConfig.gcode = {
    ...base,
    penUp: preset === 'custom' ? penUpInput.value : base.penUp,
    penDown: preset === 'custom' ? penDownInput.value : base.penDown,
    feedRate: parseInt(feedRateInput.value) || 3000,
    travelRate: parseInt(travelRateInput.value) || 5000
  };
  // Update pen command fields when preset changes
  if (preset !== 'custom') {
    penUpInput.value = base.penUp;
    penDownInput.value = base.penDown;
  }
  currentConfig.effects = {
    intensity: parseInt(intensityInput.value) / 100,
    seed: parseInt(seedInput.value) || 42
  };
  currentConfig.fontStyle = fontStyleSelect.value as 'print' | 'italic';
  saveSettings();
}

let lastDocxData: ArrayBuffer | null = null;

async function processFile(file: File) {
  status.textContent = '⏳ Обробка...';
  downloadBtn.disabled = true;
  try {
    lastDocxData = await file.arrayBuffer();
    await reconvert();
    status.textContent = `✅ ${file.name} — ${currentPages.length} стор.`;
  } catch (e: any) {
    status.textContent = `❌ Помилка: ${e.message}`;
  }
}

async function reconvert() {
  if (!lastDocxData) return;
  updateConfig();
  const result = await convert(lastDocxData, currentConfig);
  currentPages = result.pages;
  currentGcode = result.gcode;
  downloadBtn.disabled = false;

  if (result.warnings.length) {
    warnings.style.display = 'block';
    warnings.textContent = '⚠️ ' + result.warnings.join('; ');
  } else {
    warnings.style.display = 'none';
  }

  renderPreview(currentPages);
}

function renderPreview(pages: Page[]) {
  if (pages.length === 0) { previewContainer.innerHTML = ''; return; }

  const page = pages[0]; // Show first page
  const scale = 2; // preview scale
  const w = page.width * scale;
  const h = page.height * scale;

  let paths = '';
  for (const g of page.glyphs) {
    if (!g.pathData) continue;
    // Transform path data to SVG coordinates
    const transformed = transformPathForSvg(g);
    if (transformed) paths += `<path d="${transformed}" fill="none" stroke="#333" stroke-width="0.3"/>`;
  }

  previewContainer.innerHTML = `
    <svg width="${w}" height="${h}" viewBox="0 0 ${page.width} ${page.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${page.width}" height="${page.height}" fill="white"/>
      ${paths}
    </svg>
  `;
}

function transformPathForSvg(g: { x: number; y: number; scale: number; pathData: string }): string {
  // Parse the Hershey path format: "M x,y L x,y ..." and transform
  const s = g.scale;
  const ox = g.x;
  const oy = g.y;

  return g.pathData.replace(/-?\d+\.?\d*/g, (() => {
    let idx = 0;
    return (match: string) => {
      const val = parseFloat(match);
      const isX = idx % 2 === 0;
      idx++;
      if (isX) return String(Math.round((ox + val * s) * 100) / 100);
      else return String(Math.round((oy + val * s) * 100) / 100);
    };
  })());
}

// Download
downloadBtn.addEventListener('click', () => {
  if (!currentGcode) return;
  const blob = new Blob([currentGcode], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'output.gcode';
  a.click();
  URL.revokeObjectURL(url);
});
