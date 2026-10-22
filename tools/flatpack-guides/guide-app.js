import { createStage } from './stage.js';

export function startGuide(guide, createModel) {
  const $ = id => document.getElementById(id);
  const base = import.meta.env.BASE_URL;
  const steps = guide.steps;
  const storageKey = `form-${guide.slug}-${guide.manual}`;
  let current = 0, animationFrame, animationStart, isPlaying = false, scene;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    current = Math.max(0, Math.min(Math.trunc(Number(saved?.current) || 0), steps.length - 1));
  } catch { /* The guide also works without storage. */ }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  document.title = `${guide.name} in 3D | Markus Lejon`;
  document.querySelector('.skip-link').href = '#instruction-panel';
  document.querySelector('.skip-link').textContent = 'Skip to the current instruction';
  $('product-title').innerHTML = `${guide.name}<span class="title-dot">.</span>`;
  document.querySelector('.product-specs').textContent = `${guide.subtitle} · ${guide.size} · ${guide.finish}`;
  $('scene-canvas').setAttribute('aria-label', `3D ${guide.name} assembly. Drag to rotate, scroll to zoom, or use the camera controls.`);
  document.querySelector('.source-button').href = guide.manuals[0].url;
  document.querySelector('.app-shell .site-footer p').innerHTML = `Independent assembly study <span>·</span> Article ${guide.article} <span>·</span> ${guide.manual}`;
  const version = document.createElement('div');
  version.className = 'version-note';
  version.innerHTML = `<span class="version-tag">${guide.size}</span><span>Match your booklet: <strong>${guide.manual}</strong> · <a href="${guide.productUrl}" target="_blank" rel="noreferrer">${guide.article} ↗</a></span>`;
  document.querySelector('.assembly-layout').before(version);

  const sourceDialog = document.createElement('dialog');
  sourceDialog.className = 'guide-dialog source-dialog';
  sourceDialog.id = 'source-dialog';
  sourceDialog.innerHTML = `<div class="dialog-header"><span class="eyebrow" id="source-caption"></span><form method="dialog"><button class="dialog-close" aria-label="Close manual page">×</button></form></div><div id="source-tabs" class="source-tabs" role="group" aria-label="Related manual drawings"></div><img id="source-image" alt="" /><div class="source-dialog-footer"><a id="source-original" target="_blank" rel="noreferrer">Open official PDF ↗</a><a id="source-download" download>Download full manual</a></div>`;
  document.body.append(sourceDialog);
  function displaySource(source) {
    const m = guide.manuals[source.manual ?? steps[current].manual ?? 0];
    $('source-caption').textContent = `${m.id} · Page ${source.page} · ${source.label || steps[current].sourceLabel}`;
    $('source-image').src = `${base}manual/${guide.slug}/${m.prefix || 'page-'}${source.page}.png`;
    $('source-image').alt = `Original IKEA ${m.id}, page ${source.page}: ${source.label || steps[current].sourceLabel}`;
    $('source-original').href = `${m.url}#page=${source.page}`;
    $('source-download').href = `${base}manual/${guide.slug}/${m.file}`;
  }
  function openManual() {
    const s = steps[current];
    const sources = s.sources || [{ page: s.page, manual: s.manual, label: s.sourceLabel }];
    $('source-tabs').innerHTML = sources.length > 1 ? sources.map((source, i) => `<button type="button" data-source="${i}" aria-pressed="${i === 0}">${source.label}</button>`).join('') : '';
    $('source-tabs').onclick = e => {
      const button = e.target.closest('[data-source]');
      if (!button) return;
      $('source-tabs').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      displaySource(sources[Number(button.dataset.source)]);
    };
    displaySource(sources[0]); sourceDialog.showModal();
  }
  $('manual-link').addEventListener('click', e => { e.preventDefault(); openManual(); });
  const manuals = guide.manuals.map(m => `<a class="manual-link" href="${m.url}" target="_blank" rel="noreferrer">${m.title} · ${m.id} ↗</a>`).join('');
  $('inventory-content').innerHTML = `<p>${guide.prep}</p><div class="prep-facts">${guide.facts.map(f => `<span>${f}</span>`).join('')}</div><h3>Fittings and parts</h3><div class="inventory-grid">${guide.inventory.map(p => `<div class="inventory-item"><div><strong>${p.name}</strong><small>${p.code || p.detail || ''}</small></div><span>×${p.quantity}</span></div>`).join('')}</div><div class="dialog-callout"><strong>Match your exact product.</strong><p>${guide.note}</p></div>${manuals}`;
  $('inventory-button').onclick = () => $('inventory-dialog').showModal();
  $('about-button').onclick = () => $('about-dialog').showModal();
  $('about-content').innerHTML = `<p>This independent prototype turns the ${guide.name} assembly sequence into a 3D guide you can explore at your own pace.</p><p>Terracotta highlights the current action. Rotate the model, reveal a hidden connection, or replay a movement for a closer look.</p><div class="dialog-callout"><strong>Keep the official manual nearby.</strong><p>${guide.note}</p></div><p class="small-print">Sequence checked against ${guide.manual} (${guide.date}). Overall dimensions follow IKEA’s product page. Panel thicknesses, curves, holes and fittings are illustrative reconstructions. This is not a drilling template and has not been physically assembly-tested.</p>${manuals}<p class="small-print">IKEA and its product names are trademarks of Inter IKEA Systems B.V. This project is independent and is not affiliated with or endorsed by IKEA.</p>`;
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify({ current })); } catch { /* Storage is optional. */ }
  }
  function stopAnimation() {
    cancelAnimationFrame(animationFrame); isPlaying = false;
    $('replay').querySelector('span').textContent = 'Replay step';
    $('replay').setAttribute('aria-label', 'Replay current step');
  }
  function animate(now) {
    if (!isPlaying) return;
    const progress = Math.min(1, (now - animationStart) / 2800);
    scene?.setProgress(progress); $('scrubber').value = Math.round(progress * 100);
    if (progress < 1) animationFrame = requestAnimationFrame(animate); else stopAnimation();
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
    $('steps-nav').innerHTML = steps.map((s, i) => `<button type="button" data-step="${i}" class="${i === current ? 'is-active' : ''}" ${i === current ? 'aria-current="step"' : ''} title="${s.title}"><span class="journey-number">${i === 0 ? '○' : i === steps.length - 1 ? '✓' : s.label}</span><span class="journey-label">${i === 0 ? 'Prepare' : i === steps.length - 1 ? 'Finish' : s.title.replace(/\.$/, '')}</span></button>`).join('');
    if (restoreFocus) $('steps-nav').querySelector('[aria-current]')?.focus({ preventScroll: true });
  }
  function render(scrollRail = false) {
    stopAnimation(); const s = steps[current];
    $('phase').textContent = `${s.phase} · ${s.sourceLabel}`;
    $('step-count').textContent = `${String(current + 1).padStart(2, '0')} / ${steps.length}`;
    $('progress').style.width = `${current / (steps.length - 1) * 100}%`;
    $('step-title').textContent = s.title;
    $('step-description').textContent = s.description;
    $('step-parts').innerHTML = s.parts.map(p => `<div class="part-item"><span class="part-swatch" aria-hidden="true">▱</span><div><strong>${p.name}</strong><span>${p.code || 'For this action'}</span></div><b class="part-quantity">×${p.quantity}</b></div>`).join('');
    document.querySelector('.parts-section').hidden = !s.parts.length;
    $('step-tip').innerHTML = `<span class="tip-mark" aria-hidden="true">i</span><p>${s.tip}</p>`;
    $('manual-link').href = `${guide.manuals[s.manual || 0].url}#page=${s.page}`;
    $('manual-link').querySelector('span').textContent = s.sources?.length > 1 ? `View IKEA’s drawings · ${s.sources.length} pages` : `View IKEA’s drawing · page ${s.page}`;
    $('model-step-label').textContent = s.orientation;
    $('prev').disabled = current === 0;
    $('next').disabled = current === steps.length - 1;
    $('next').querySelector('span').textContent = current === 0 ? 'Let’s begin' : current === steps.length - 2 ? 'Final check' : current === steps.length - 1 ? 'Guide finished' : 'Next step';
    $('scrubber').value = 100;
    $('replay').disabled = current === 0 || current === steps.length - 1 || !scene;
    $('focus').disabled = current === 0 || !scene;
    $('completion').hidden = current !== steps.length - 1;
    if (current === steps.length - 1) {
      $('completion').innerHTML = `<h3>Your final check</h3>${guide.checklist.map(check => `<label><input type="checkbox" /> ${check}</label>`).join('')}<button type="button" class="text-button" id="restart">Start this guide again ↺</button><a class="other-guide" href="${base}">Explore another guide →</a>`;
      $('restart').onclick = () => go(0);
    }
    renderRail();
    if (scrollRail) {
      const rail = $('steps-nav'), active = rail.querySelector('[aria-current]');
      rail.scrollTo({ left: active.offsetLeft - rail.offsetLeft - rail.clientWidth / 2 + active.clientWidth / 2, behavior: 'instant' });
    }
    if (scene?.setStep(current)) updateViewButtons('perspective');
    $('part-label').hidden = true; save();
  }
  function go(index) {
    current = Math.max(0, Math.min(index, steps.length - 1)); render(true);
    if (matchMedia('(max-width: 680px)').matches) $('scene-wrap').scrollIntoView({ block: 'start', behavior: 'instant' });
    if (current > 0 && current < steps.length - 1) replay();
  }
  $('prev').onclick = () => go(current - 1);
  $('next').onclick = () => go(current + 1);
  $('steps-nav').onclick = e => { const b = e.target.closest('[data-step]'); if (b) go(Number(b.dataset.step)); };
  $('replay').onclick = replay;
  $('scrubber').oninput = e => { stopAnimation(); scene?.setProgress(Number(e.target.value) / 100); };
  for (const [id, fn] of [['explode', 'setExploded'], ['xray', 'setXray']]) {
    $(id).onclick = () => { const pressed = $(id).getAttribute('aria-pressed') !== 'true'; $(id).setAttribute('aria-pressed', String(pressed)); scene?.[fn](pressed); };
  }
  $('focus').onclick = () => scene?.focus();
  function updateViewButtons(view) {
    document.querySelectorAll('[data-view]').forEach(b => { const active = b.dataset.view === view; b.setAttribute('aria-pressed', String(active)); b.classList.toggle('is-active', active); });
  }
  function selectView(view) { scene?.setView(view); updateViewButtons(view); }
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => selectView(b.dataset.view));
  $('reset-view').onclick = () => selectView('perspective');
  document.addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]') || ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || e.target === $('scene-canvas')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
  });
  try {
    let labelTimer;
    scene = createStage($('scene-canvas'), createModel, name => {
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
}
