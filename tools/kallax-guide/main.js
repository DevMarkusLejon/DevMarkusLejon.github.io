import { createAssemblyScene } from './scene.js';
import { MANUAL, ALTERNATIVE_MANUAL, product, inventory, getSteps } from './guide-data.js';

const $ = id => document.getElementById(id);
const base = import.meta.env.BASE_URL;
const storageKey = 'form-kallax-AA-2703308-1';
let mode = 'floor', current = 0, animationFrame, animationStart, isPlaying = false, scene;
let steps = getSteps(mode);
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved && ['floor', 'wall'].includes(saved.mode)) {
    mode = saved.mode; steps = getSteps(mode);
    current = Math.max(0, Math.min(Number(saved.current) || 0, steps.length - 1));
  }
} catch { /* The guide remains usable when browser storage is unavailable. */ }
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const modeControl = document.createElement('div');
modeControl.className = 'installation-options';
modeControl.innerHTML = `<span>Installation</span><div role="group" aria-label="Installation type"><button data-mode="floor" type="button">On the floor</button><button data-mode="wall" type="button">Wall-hung</button></div>`;
document.querySelector('.product-summary').append(modeControl);
const versionNote = document.createElement('div');
versionNote.className = 'version-note';
versionNote.innerHTML = `<span class="version-tag">10-dowel kit</span><span>Match your booklet: <strong>${product.manual}</strong>. Have 14 dowels? <a href="${ALTERNATIVE_MANUAL}" target="_blank" rel="noreferrer">Use IKEA’s other manual ↗</a></span>`;
document.querySelector('.assembly-layout').before(versionNote);

const sourceDialog = document.createElement('dialog');
sourceDialog.className = 'guide-dialog source-dialog';
sourceDialog.id = 'source-dialog';
sourceDialog.innerHTML = `<div class="dialog-header"><span class="eyebrow" id="source-caption"></span><form method="dialog"><button class="dialog-close" aria-label="Close manual page">×</button></form></div><img id="source-image" alt="" /><div class="source-dialog-footer"><a id="source-original" target="_blank" rel="noreferrer">Open official PDF ↗</a><a href="${base}manual/kallax-AA-2703308-1.pdf" download>Download full manual</a></div>`;
document.body.append(sourceDialog);
function openManual() {
  const s = steps[current];
  $('source-caption').textContent = `IKEA ${product.manual} · Page ${s.page} · ${s.manualStep === 'Before you start' ? 'Preparation' : `Step ${s.manualStep}`}`;
  $('source-image').src = `${base}manual/page-${s.page}.png`;
  $('source-image').alt = `Original IKEA manual page ${s.page}, corresponding to ${s.title}`;
  $('source-original').href = s.officialSource;
  sourceDialog.showModal();
}
$('manual-link').addEventListener('click', event => { event.preventDefault(); openManual(); });

const inventoryIcon = kind => {
  const paths = {
    panel: '<path d="M4 10 21 3l8 7-17 9-8-9Zm0 0v12l8 7V19m0 10 17-9V10"/>',
    dowel: '<path d="m8 25 15-17m-19 13L19 4m-15 17 4 4 4-1L27 9l-4-5-4 0M8 19 20 7m-9 15L24 9"/>',
    screw: '<path d="m9 25 13-14m-17 9 12-14M5 20l4 5m6-21 11 11m-11-11 3-3 11 11-3 3M11 18l5 1m-2-4 5 1m-2-4 5 1"/>',
    bracket: '<path d="M7 5h18v22H7V5Zm0 0-4 3v17l4 2M12 10h8v10h-8V10Z"/>',
    pad: '<path d="M5 8h22v17H5V8Zm11 0v17M5 16h22"/>',
    tool: '<path d="M8 4h5v19h14v5H8V4Z"/>',
    cover: '<path d="m7 6 17-2 4 4v19H9l-4-4V8l2-2Zm2 2v19m0-19 19 0"/>',
    plate: '<circle cx="16" cy="16" r="11"/><path d="M12 9h8v9l-4 5-4-5V9Z"/>',
  };
  return `<svg viewBox="0 0 32 32" aria-hidden="true">${paths[kind] || paths.panel}</svg>`;
};
$('inventory-content').innerHTML = `<p>This guide matches <strong>${product.manual} · 10 dowels</strong>. Check the booklet in your box before you begin. IKEA also supplies a different 14-dowel version.</p><div class="prep-facts"><span>Two people</span><span>Soft, clear surface</span><span>Wall attachment required</span></div><h3>In the box</h3><div class="inventory-grid">${inventory.map(p => `<div class="inventory-item">${inventoryIcon(p.kind)}<div><strong>${p.name}</strong><small>${p.code || p.detail}</small></div><span>×${p.quantity}</span></div>`).join('')}</div><h3>Bring along</h3><p>Hammer, flat-head and cross-head screwdrivers, pencil, spirit level, and wall screws and plugs suited to your wall. Consult the complete manual for the wall attachment requirements.</p><div class="dialog-callout"><strong>Identify the seven panels.</strong><p>Two long thick panels, two shorter thick side panels, one long thin middle shelf, and two short thin dividers. The panel dimensions and hardware in this 3D model are illustrative; use the actual factory holes.</p></div><a class="manual-link" href="${MANUAL}#page=10" target="_blank" rel="noreferrer">Check IKEA’s parts inventory, pages 10–11 ↗</a>`;
$('inventory-button').addEventListener('click', () => $('inventory-dialog').showModal());
$('about-button').addEventListener('click', () => $('about-dialog').showModal());
document.querySelector('#about-dialog .dialog-callout').insertAdjacentHTML('afterend', `<p class="small-print">Sequence and fittings checked against all illustrated steps of AA-2703308-1 (2026-03-24), including both installation paths. Overall dimensions follow IKEA’s product page; panel thicknesses, hole spacing, and fitting shapes are reconstructed for illustration. This is a prototype, not a drilling template.</p>`);

function save() {
  try { localStorage.setItem(storageKey, JSON.stringify({ mode, current })); } catch { /* Storage can be disabled in private browsing. */ }
}
function stopAnimation() {
  cancelAnimationFrame(animationFrame); isPlaying = false;
  $('replay').querySelector('span').textContent = 'Replay step';
  $('replay').setAttribute('aria-label', 'Replay current step');
}
function animate(now) {
  if (!isPlaying) return;
  const progress = Math.min(1, (now - animationStart) / 2100);
  scene?.setProgress(progress);
  $('scrubber').value = Math.round(progress * 100);
  if (progress < 1) animationFrame = requestAnimationFrame(animate);
  else stopAnimation();
}
function replay() {
  if (isPlaying) { stopAnimation(); return; }
  if (reducedMotion.matches) { scene?.setProgress(1); $('scrubber').value = 100; return; }
  animationStart = performance.now(); isPlaying = true;
  $('replay').querySelector('span').textContent = 'Pause animation';
  $('replay').setAttribute('aria-label', 'Pause current animation');
  animationFrame = requestAnimationFrame(animate);
}

function renderRail() {
  const restoreFocus = $('steps-nav').contains(document.activeElement);
  $('steps-nav').innerHTML = steps.map((s, i) => `<button type="button" data-step="${i}" class="${i === current ? 'is-active' : ''}" ${i === current ? 'aria-current="step"' : ''} title="${s.title}"><span class="journey-number">${i === 0 ? '○' : i === steps.length - 1 ? '✓' : s.manualStep}</span><span class="journey-label">${i === 0 ? 'Prepare' : i === steps.length - 1 ? 'Finish' : s.title.replace(/\.$/, '')}</span></button>`).join('');
  if (restoreFocus) $('steps-nav').querySelector('[aria-current]')?.focus({ preventScroll: true });
}
function render({ scrollRail = false } = {}) {
  stopAnimation();
  const s = steps[current];
  $('phase').textContent = `${s.phase}${current > 0 && current < steps.length - 1 ? ` · IKEA step ${s.manualStep}` : ''}`;
  $('step-count').textContent = `${String(current + 1).padStart(2, '0')} / ${steps.length}`;
  $('progress').style.width = `${current / (steps.length - 1) * 100}%`;
  $('step-title').textContent = s.title;
  $('step-description').textContent = s.description;
  $('step-parts').innerHTML = s.parts.map(p => `<div class="part-item"><span class="part-swatch" aria-hidden="true">${p.name.toLowerCase().includes('dowel') ? '⫴' : p.name.toLowerCase().includes('screw') ? '↗' : '▱'}</span><div><strong>${p.name}</strong><span>${p.code || 'For this action'}</span></div><b class="part-quantity">×${p.quantity}</b></div>`).join('');
  document.querySelector('.parts-section').hidden = !s.parts.length;
  $('step-tip').innerHTML = `<span class="tip-mark" aria-hidden="true">i</span><p>${s.tip}</p>`;
  $('manual-link').href = s.officialSource;
  $('manual-link').querySelector('span').textContent = `View IKEA’s drawing · page ${s.page}`;
  $('model-step-label').textContent = current === 0 ? '76.5 × 76.5 × 39 cm · seven panels' : current === steps.length - 1 ? 'Final connection check' : `Step ${s.manualStep} · ${current < 9 ? 'Openings face up' : mode === 'floor' ? 'Floor-standing' : 'Wall-hung'}`;
  $('prev').disabled = current === 0;
  $('next').disabled = current === steps.length - 1;
  $('next').querySelector('span').textContent = current === 0 ? 'Let’s begin' : current === steps.length - 2 ? 'Final check' : current === steps.length - 1 ? 'Guide finished' : 'Next step';
  $('scrubber').value = 100;
  document.querySelector('[data-view="front"]').textContent = current > 0 && current <= 9 && steps[current].scene !== 'wallBrackets' ? 'Top' : 'Front';
  $('replay').disabled = current === 0 || current === steps.length - 1 || !scene;
  $('focus').disabled = current === 0 || !scene;
  $('completion').hidden = current !== steps.length - 1;
  if (current === steps.length - 1) {
    $('completion').innerHTML = `<h3>Your final check</h3><label><input type="checkbox" /> All eight frame screws are tight.</label><label><input type="checkbox" /> Both wall attachments are secure.</label><label><input type="checkbox" /> Bracket locking plates and covers are fitted.</label><button type="button" class="text-button" id="restart">Start this guide again ↺</button>`;
    $('restart').onclick = () => go(0);
  }
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  renderRail();
  if (scrollRail) {
    const rail = $('steps-nav'), active = rail.querySelector('[aria-current]');
    if (active) rail.scrollTo({ left: active.offsetLeft - rail.offsetLeft - rail.clientWidth / 2 + active.clientWidth / 2, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }
  if (scene?.setStep(s.scene, mode)) updateViewButtons('perspective');
  $('part-label').hidden = true;
  save();
}
function go(index) {
  current = Math.max(0, Math.min(index, steps.length - 1)); render({ scrollRail: true });
  if (window.matchMedia('(max-width: 680px)').matches) $('scene-wrap').scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  if (current > 0 && current < steps.length - 1) replay();
}
$('prev').addEventListener('click', () => go(current - 1));
$('next').addEventListener('click', () => go(current + 1));
$('steps-nav').addEventListener('click', e => {
  const b = e.target.closest('[data-step]');
  if (b) go(Number(b.dataset.step));
});
modeControl.addEventListener('click', e => {
  const b = e.target.closest('[data-mode]');
  if (!b || b.dataset.mode === mode) return;
  mode = b.dataset.mode; steps = getSteps(mode);
  current = Math.min(current, 8); render();
});
$('replay').addEventListener('click', replay);
$('scrubber').addEventListener('input', e => { stopAnimation(); scene?.setProgress(Number(e.target.value) / 100); });
for (const [id, fn] of [['explode', 'setExploded'], ['xray', 'setXray']]) {
  $(id).addEventListener('click', () => {
    const pressed = $(id).getAttribute('aria-pressed') !== 'true';
    $(id).setAttribute('aria-pressed', String(pressed)); scene?.[fn](pressed);
  });
}
$('focus').addEventListener('click', () => scene?.focus());
function selectView(view) {
  scene?.setView(view);
  updateViewButtons(view);
}
function updateViewButtons(view) {
  document.querySelectorAll('[data-view]').forEach(b => {
    const active = b.dataset.view === view;
    b.setAttribute('aria-pressed', String(active)); b.classList.toggle('is-active', active);
  });
}
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => selectView(b.dataset.view)));
$('reset-view').addEventListener('click', () => selectView('perspective'));
document.addEventListener('keydown', e => {
  if (document.querySelector('dialog[open]') || ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || e.target === $('scene-canvas')) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
});
try {
  let labelTimer;
  scene = createAssemblyScene($('scene-canvas'), name => {
    clearTimeout(labelTimer); $('part-label').textContent = name; $('part-label').hidden = false;
    labelTimer = setTimeout(() => { $('part-label').hidden = true; }, 4000);
  });
  $('loading').hidden = true;
} catch (error) {
  console.error('3D renderer could not start:', error);
  $('loading').innerHTML = '<span>3D is unavailable in this browser.<br />Every instruction and original IKEA drawing is still available below.</span>';
  document.querySelectorAll('.viewer-tools button, [data-view], #reset-view, #scrubber').forEach(b => { b.disabled = true; });
}
render();
