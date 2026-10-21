import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const keys = ['overview', 'dowels', 'bolts', 'firstPanels', 'firstCams', 'top', 'secondSide', 'remainingCams', 'shelfMarks', 'back', 'nailGuide', 'nails', 'raise', 'anchor', 'supports', 'shelves', 'complete'];
const names = { left: 'Left side · inner shelf-support holes', right: 'Right side · inner shelf-support holes', bottom: 'Bottom panel · cam holes underneath', middle: 'Fixed middle shelf', top: 'Top panel · cam holes face outwards', plinth: 'Narrow front plinth', shelf0: 'Lower adjustable shelf', shelf1: 'Lower adjustable shelf', shelf2: 'Upper adjustable shelf', shelf3: 'Upper adjustable shelf' };

export function createAssemblyScene(canvas, onPick) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.02, 40);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.minDistance = 0.25;
  controls.maxDistance = 9;
  controls.maxPolarAngle = Math.PI / 2 + 0.14;
  scene.add(new THREE.HemisphereLight(0xfffbf3, 0x91887b, 2.1));
  const light = new THREE.DirectionalLight(0xfff7e8, 3.4);
  light.position.set(-2.4, 4, 3);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.camera.left = light.shadow.camera.bottom = -3;
  light.shadow.camera.right = light.shadow.camera.top = 3;
  light.shadow.normalBias = 0.0015;
  scene.add(light);
  const rim = new THREE.DirectionalLight(0xe3eeef, 2.6);
  rim.position.set(2, 2.8, -2);
  scene.add(rim);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.ShadowMaterial({ color: 0x665b4c, opacity: 0.17 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.006;
  floor.receiveShadow = true;
  scene.add(floor);
  const root = new THREE.Group();
  scene.add(root);
  const panels = {}, dowels = [], bolts = [], cams = [], nails = [];
  const metal = () => new THREE.MeshStandardMaterial({ color: 0x858d8d, metalness: 0.72, roughness: 0.32 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x4d5149, roughness: 1 });
  let currentKey = 'overview', progress = 1, exploded = false, xray = false, focused = false, tween;
  const smooth = x => x * x * (3 - 2 * x);
  const levelYs = [-0.594, -0.28, 0.365, 0.684];
  function mesh(geometry, material, parent = root) {
    const m = new THREE.Mesh(geometry, material);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function panel(id, size, position, introduced, offset = V()) {
    const group = new THREE.Group(); root.add(group);
    const material = new THREE.MeshStandardMaterial({ color: 0xf3eee4, roughness: 0.64 });
    const body = mesh(new RoundedBoxGeometry(...size, 2, 0.0014), material, group);
    body.userData.name = names[id];
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)), new THREE.LineBasicMaterial({ color: 0x8e9484, transparent: true, opacity: 0.15 }));
    group.add(outline);
    panels[id] = { group, body, material, position, introduced, offset };
    return group;
  }
  panel('left', [0.018, 2.02, 0.28], V(-0.391, 0, 0), 0);
  panel('right', [0.018, 2.02, 0.28], V(0.391, 0, 0), 6, V(0.3, 0, 0));
  panel('bottom', [0.764, 0.018, 0.26], V(0, -0.904, 0.006), 3, V(0.22, 0, 0));
  panel('middle', [0.764, 0.018, 0.26], V(0, 0.048, 0.006), 3, V(0.22, 0, 0));
  panel('top', [0.764, 0.018, 0.28], V(0, 1.001, 0), 5, V(0.22, 0, 0));
  panel('plinth', [0.764, 0.088, 0.018], V(0, -0.957, 0.122), 3, V(0.22, 0, 0));
  levelYs.forEach((y, i) => panel(`shelf${i}`, [0.762, 0.018, 0.256], V(0, y, 0.008), 15, V(0, 0.12, 0.015)));

  for (const id of ['left', 'right']) {
    const inward = id === 'left' ? 1 : -1;
    const holes = new THREE.InstancedMesh(new THREE.CircleGeometry(0.0017, 10), dark, 108);
    const dummy = new THREE.Object3D();
    let index = 0;
    for (let j = 0; j < 54; j++) for (const z of [-0.092, 0.092]) {
      dummy.position.set(inward * 0.0092, -0.814 + j * 0.032, z);
      dummy.rotation.y = inward * Math.PI / 2;
      dummy.updateMatrix(); holes.setMatrixAt(index++, dummy.matrix);
    }
    panels[id].group.add(holes);
    const groove = mesh(new THREE.BoxGeometry(0.0007, 1.92, 0.003), new THREE.MeshStandardMaterial({ color: 0xa9a693 }), panels[id].group);
    groove.position.set(inward * 0.0094, 0.046, -0.135);
  }

  function hardware(kind, parent, position, axis, collection, introduced) {
    const group = new THREE.Group(); parent.add(group);
    const material = kind === 'dowel' ? new THREE.MeshStandardMaterial({ color: 0xa57b49, roughness: 0.9 }) : metal();
    const length = kind === 'dowel' ? 0.034 : kind === 'nail' ? 0.024 : 0.034;
    const radius = kind === 'dowel' ? 0.0037 : kind === 'nail' ? 0.0009 : 0.0028;
    mesh(new THREE.CylinderGeometry(radius, radius, length, 12), material, group);
    if (kind !== 'dowel') {
      const head = mesh(new THREE.CylinderGeometry(kind === 'nail' ? 0.0022 : 0.0041, kind === 'nail' ? 0.0022 : 0.0041, 0.002, 12), material, group);
      head.position.y = length / 2;
    } else {
      for (let i = 0; i < 5; i++) {
        const ridge = mesh(new THREE.TorusGeometry(radius, 0.0002, 3, 10), material, group);
        ridge.rotation.x = Math.PI / 2; ridge.position.y = (i - 2) * 0.005;
      }
    }
    group.quaternion.setFromUnitVectors(V(0, 1, 0), axis);
    let marker;
    if (kind === 'nail') {
      marker = mesh(new THREE.RingGeometry(0.004, 0.009, 20), new THREE.MeshBasicMaterial({ color: 0xb85d3f, side: THREE.DoubleSide }), group);
      marker.rotation.x = -Math.PI / 2;
      marker.position.y = length / 2 + 0.0015;
    }
    collection.push({ group, material, position, axis, introduced, kind, marker });
  }
  for (const id of ['bottom', 'middle', 'top', 'plinth']) {
    for (const x of [-0.383, 0.383]) for (const v of [-1, 1]) {
      hardware('dowel', panels[id].group, id === 'plinth' ? V(x, v * 0.025, 0) : V(x, 0, v * 0.086), V(Math.sign(x), 0, 0), dowels, 1);
    }
  }
  for (const side of ['left', 'right']) for (const y of [-0.904, 0.048, 1.001]) for (const z of [-0.085, 0.085]) {
    const inward = side === 'left' ? 1 : -1;
    hardware('bolt', panels[side].group, V(inward * 0.019, y, z), V(inward, 0, 0), bolts, 2);
  }
  for (const id of ['bottom', 'middle', 'top']) for (const x of [-0.356, 0.356]) for (const z of [-0.085, 0.085]) {
    const group = new THREE.Group(), material = metal(), sign = id === 'top' ? 1 : -1;
    panels[id].group.add(group);
    const hole = mesh(new THREE.CircleGeometry(0.0075, 20), dark, panels[id].group);
    hole.rotation.x = -sign * Math.PI / 2;
    hole.position.set(x, sign * 0.0092, z);
    mesh(new THREE.CylinderGeometry(0.0071, 0.0071, 0.012, 20), material, group);
    const slot = mesh(new THREE.BoxGeometry(0.009, 0.0005, 0.0011), dark, group);
    slot.position.y = 0.0063;
    group.rotation.x = sign < 0 ? Math.PI : 0;
    cams.push({ group, material, position: V(x, sign * 0.0035, z), sign, introduced: x > 0 ? 7 : id === 'top' ? 5 : 4 });
  }

  const back = new THREE.Group(); root.add(back);
  const backSections = [];
  for (let i = 0; i < 3; i++) {
    const material = new THREE.MeshStandardMaterial({ color: 0xb5af9c, roughness: 0.92 });
    const inside = new THREE.MeshStandardMaterial({ color: 0xf0eee5, roughness: 0.88 });
    const body = mesh(new THREE.BoxGeometry(0.257, 1.914, 0.003), [material, material, material, material, inside, material], back);
    body.userData.name = 'Folding back · seated in the rear grooves';
    backSections.push({ body, material, inside });
  }
  for (const y of [-0.904, 0.048, 1.001]) for (let i = 0; i < 6; i++) {
    hardware('nail', root, V(-0.32 + i * 0.128, y, -0.124), V(0, 0, -1), nails, 11);
  }
  const pencil = new THREE.LineBasicMaterial({ color: 0xa64e30, transparent: true, opacity: 0.9 });
  const marks = new THREE.Group(); root.add(marks);
  for (const x of [-0.391, 0.391]) marks.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(x - 0.008, 0.048, -0.141), V(x + 0.008, 0.048, -0.141)]), pencil));
  const guide = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(-0.381, 0.048, -0.137), V(0.381, 0.048, -0.137)]), pencil);
  root.add(guide);

  const attachments = new THREE.Group(), attachmentMaterials = []; root.add(attachments);
  for (const x of [-0.29, 0.29]) {
    const a = new THREE.Group(); attachments.add(a); a.position.set(x, 1.014, -0.16);
    const material = metal();
    attachmentMaterials.push(material);
    mesh(new THREE.BoxGeometry(0.028, 0.003, 0.09), material, a).position.z = 0.045;
    mesh(new THREE.BoxGeometry(0.028, 0.06, 0.003), material, a).position.y = 0.03;
    const wallSlot = mesh(new THREE.RingGeometry(0.004, 0.007, 20), dark, a);
    wallSlot.position.set(0, 0.039, 0.0017);
    const washerTop = mesh(new THREE.RingGeometry(0.0028, 0.007, 20), material, a);
    washerTop.rotation.x = -Math.PI / 2; washerTop.position.set(0, 0.002, 0.064);
    const washerWall = mesh(new THREE.RingGeometry(0.0028, 0.007, 20), material, a);
    washerWall.position.set(0, 0.039, 0.003);
    const screw = mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.022, 12), material, a);
    screw.position.set(0, -0.006, 0.064);
    const head = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.002, 12), material, a);
    head.position.set(0, 0.006, 0.064);
    const wallScrew = mesh(new THREE.CylinderGeometry(0.0023, 0.0023, 0.04, 12), material, a);
    wallScrew.rotation.x = Math.PI / 2; wallScrew.position.set(0, 0.039, -0.015);
    mesh(new THREE.SphereGeometry(0.004, 10, 6), material, a).position.set(0, 0.039, 0.007);
  }
  const wall = mesh(new THREE.PlaneGeometry(1.5, 2.4), new THREE.MeshStandardMaterial({ color: 0xd6d2c7, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }));
  wall.position.set(0, 0.15, -0.176); wall.castShadow = false;
  const supports = new THREE.Group(); root.add(supports);
  const supportMaterials = [];
  for (const y of levelYs) for (const x of [-0.376, 0.376]) for (const z of [-0.092, 0.092]) {
    const group = new THREE.Group(); supports.add(group); group.position.set(x, y - 0.012, z);
    const material = new THREE.MeshStandardMaterial({ color: 0xc1c6b8, roughness: 0.6 });
    supportMaterials.push(material);
    const stem = mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.014, 12), material, group);
    stem.rotation.z = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.003, 16), material, group).position.x = x < 0 ? 0.009 : -0.009;
    mesh(new THREE.CylinderGeometry(0.0024, 0.0024, 0.006, 12), material, group).position.set(x < 0 ? 0.009 : -0.009, 0.004, 0);
  }
  function number() { return Math.max(0, keys.indexOf(currentKey)); }
  function stage(n = number()) { return n === 0 || n >= 12 ? 'upright' : n === 1 ? 'panels' : n === 2 ? 'sides' : n <= 7 ? 'side' : 'rear'; }
  function update() {
    const n = number(), t = smooth(progress), currentStage = stage(), overview = n === 0;
    root.rotation.set(0, 0, 0); root.position.set(0, 0, 0);
    if (currentStage === 'upright') root.position.y = 1.01;
    if (currentStage === 'side') { root.rotation.z = Math.PI / 2; root.position.y = 0.401; }
    if (currentStage === 'rear') { root.rotation.x = Math.PI / 2; root.position.y = 0.141; }
    if (currentKey === 'raise') {
      const angle = (1 - t) * Math.PI / 2;
      root.rotation.x = angle; root.position.y = 1.01 * Math.cos(angle) + 0.14 * Math.sin(angle);
    }
    floor.visible = !exploded;
    for (const [id, p] of Object.entries(panels)) {
      p.group.rotation.set(0, 0, 0); p.group.position.copy(p.position);
      p.group.visible = overview || n >= p.introduced;
      let active = p.introduced === n && !overview;
      if (n === 1) {
        p.group.visible = ['top', 'middle', 'bottom', 'plinth'].includes(id); active = p.group.visible;
        const layout = { top: [-0.44, 0.012, -0.23], middle: [0.44, 0.012, -0.23], bottom: [-0.44, 0.012, 0.23], plinth: [0.44, 0.012, 0.23] };
        if (layout[id]) p.group.position.set(...layout[id]);
        if (id === 'plinth') p.group.rotation.x = Math.PI / 2;
      } else if (n === 2) {
        p.group.visible = id === 'left' || id === 'right'; active = p.group.visible;
        p.group.rotation.z = id === 'left' ? Math.PI / 2 : -Math.PI / 2;
        p.group.position.set(0, 0.01, id === 'left' ? -0.23 : 0.23);
      } else if (active) p.group.position.addScaledVector(p.offset, 1 - t);
      if (exploded && !['panels', 'sides'].includes(currentStage)) {
        if (id === 'left' || id === 'right') p.group.position.x += Math.sign(p.position.x) * 0.16;
        else if (id.startsWith('shelf')) p.group.position.z += 0.25;
        else if (id === 'plinth') p.group.position.z += 0.19;
        else if (id === 'top') p.group.position.y += 0.16;
        else if (id === 'bottom') p.group.position.y -= 0.12;
      }
      p.material.color.set(active ? 0xc8795e : xray ? 0xa8b8ad : 0xf3eee4);
      p.material.transparent = xray && !active; p.material.opacity = xray && !active ? 0.1 : 1;
      p.material.depthWrite = !(xray && !active); p.material.needsUpdate = true;
      p.body.castShadow = p.body.receiveShadow = !(xray && !active);
    }
    for (const h of [...dowels, ...bolts, ...nails]) {
      h.group.visible = n >= h.introduced || overview;
      h.group.position.copy(h.position);
      if (n === h.introduced) h.group.position.addScaledVector(h.axis, (1 - t) * 0.055);
      h.material.color.set(n === h.introduced ? 0xb85d3f : h.kind === 'dowel' ? 0xa57b49 : 0x858d8d);
      if (h.marker) h.marker.visible = n === h.introduced;
    }
    // Parents carry prepared fittings into their later assembly positions.
    dowels.forEach(h => { if (n === 2) h.group.visible = false; });
    bolts.forEach(h => { if (n === 1) h.group.visible = false; });
    cams.forEach(h => {
      h.group.visible = overview || n >= h.introduced; h.group.position.copy(h.position);
      h.group.rotation.set(h.sign < 0 ? Math.PI : 0, 0, 0);
      if (n === h.introduced) { h.group.position.y += h.sign * (1 - t) * 0.04; h.group.rotateY((1 - t) * Math.PI); }
      h.material.color.set(n === h.introduced ? 0xb85d3f : 0x858d8d);
    });
    back.visible = overview || n >= 9;
    back.position.set(0, 0.045, -0.135 - (exploded ? 0.27 : 0));
    const slide = n === 9 ? smooth(Math.max(0, (progress - 0.33) / 0.67)) : 1;
    back.position.y -= n === 9 ? (1 - slide) * 1.75 : 0;
    const foldAngle = n === 9 ? (1 - Math.min(1, progress / 0.33)) * 1.3 : 0;
    backSections.forEach((s, i) => {
      const sign = i - 1;
      s.body.position.set(sign === 0 ? 0 : sign * (0.1285 + 0.1285 * Math.cos(foldAngle)), 0, sign === 0 ? 0 : -0.1285 * Math.sin(foldAngle));
      s.body.rotation.y = -sign * foldAngle;
      s.material.color.set(n === 9 ? 0xc8795e : 0xb5af9c);
      for (const mat of [s.material, s.inside]) { mat.transparent = xray; mat.opacity = xray ? 0.12 : 1; mat.depthWrite = !xray; mat.needsUpdate = true; }
      s.body.castShadow = s.body.receiveShadow = !xray;
    });
    marks.visible = n >= 8 && !overview;
    guide.visible = n >= 10 && !overview;
    guide.scale.x = n === 10 ? Math.max(0.01, t) : 1;
    attachments.visible = overview ? false : n >= 13;
    attachments.position.y = n === 13 ? (1 - t) * 0.12 : 0;
    attachmentMaterials.forEach(m => m.color.set(n === 13 ? 0xb85d3f : 0x858d8d));
    wall.visible = !overview && n >= 12;
    supports.visible = overview || n >= 14;
    supports.children.forEach(s => {
      s.position.x = Math.sign(s.position.x) * (0.376 - (n === 14 ? (1 - t) * 0.045 : 0));
    });
    supportMaterials.forEach(m => m.color.set(n === 14 ? 0xb85d3f : 0xc1c6b8));
    root.updateMatrixWorld(true);
  }
  function moveCamera(position, target, instant = false) {
    if (instant || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      camera.position.copy(position); controls.target.copy(target); controls.update(); return;
    }
    tween = { start: performance.now(), from: camera.position.clone(), to: position, targetFrom: controls.target.clone(), targetTo: target };
  }
  function setView(view = 'perspective', instant = false) {
    focused = false;
    const standing = stage() === 'upright', target = V(0, standing ? 1 : stage() === 'side' ? 0.3 : 0.1, 0);
    const position = view === 'front'
      ? standing ? V(0, 1.02, 4.5) : V(0, 4.3, 0.01)
      : view === 'back' ? V(-1.8, standing ? 1.9 : 2.7, -3.3)
        : standing ? V(1.8, 2, 3.65) : V(-1.8, 2.1, 2.6);
    moveCamera(position, target, instant);
  }
  function focus() {
    focused = true;
    const n = number();
    const active = n === 1 ? dowels : n === 2 ? bolts : [4, 5, 7].includes(n) ? cams.filter(h => h.introduced === n) : n === 11 ? nails : [];
    let target;
    if (active.length) {
      const positions = active.map(h => h.group.getWorldPosition(V()));
      positions.sort((a, b) => a.distanceToSquared(camera.position) - b.distanceToSquared(camera.position)); target = positions[0];
    } else if (n === 13) target = attachments.children[0].getWorldPosition(V()).add(V(0, 0.04, 0.03));
    else if (n >= 14) target = supports.children[0].getWorldPosition(V());
    else if (n >= 8) target = root.localToWorld(V(-0.28, 0.048, -0.14));
    else target = panels[n === 6 ? 'right' : 'middle'].group.getWorldPosition(V());
    const direction = camera.position.clone().sub(controls.target).normalize();
    moveCamera(target.clone().addScaledVector(direction, n >= 8 ? 0.6 : 0.55), target);
  }
  const raycaster = new THREE.Raycaster(); let pointerDown;
  canvas.addEventListener('pointerdown', e => { pointerDown = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => {
    if (!pointerDown || Math.hypot(e.clientX - pointerDown[0], e.clientY - pointerDown[1]) > 6) return;
    const r = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), camera);
    const hit = raycaster.intersectObjects([...Object.values(panels).filter(p => p.group.visible).map(p => p.body), ...(back.visible ? backSections.map(s => s.body) : [])])[0];
    if (hit) onPick?.(hit.object.userData.name);
  });
  const observer = new ResizeObserver(() => {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  });
  observer.observe(canvas);
  let frame, disposed = false;
  function render(now) {
    if (disposed) return;
    frame = requestAnimationFrame(render);
    if (tween) {
      const t = smooth(Math.min(1, (now - tween.start) / 650));
      camera.position.lerpVectors(tween.from, tween.to, t); controls.target.lerpVectors(tween.targetFrom, tween.targetTo, t);
      if (t === 1) tween = undefined;
    }
    controls.update(); renderer.render(scene, camera);
  }
  controls.addEventListener('start', () => { tween = undefined; });
  update(); setView('perspective', true); render(performance.now());
  return {
    setStep(key) {
      const previousStage = stage(); currentKey = key; progress = 1; update();
      const reset = focused || previousStage !== stage(); if (reset) setView(); return reset;
    },
    setProgress(value) { progress = value; update(); },
    setExploded(value) { exploded = value; update(); },
    setXray(value) { xray = value; update(); },
    setView, focus,
    dispose() { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); renderer.dispose(); },
  };
}
