import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const keys = ['overview', 'corner', 'divider1', 'middle', 'centerDowels', 'divider2', 'outerDowels', 'side', 'close', 'pads', 'brackets', 'mark', 'wallScrews', 'secure', 'complete'];
const names = {
  base: 'Long outer panel · base', left: 'Short outer panel · left side',
  lower: 'Short divider · lower', middle: 'Full-width middle divider',
  upper: 'Short divider · upper', right: 'Short outer panel · right side', top: 'Long outer panel · top',
};

export function createAssemblyScene(canvas, onPick) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.02, 40);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.minDistance = 0.24;
  controls.maxDistance = 4;
  controls.maxPolarAngle = Math.PI / 2 + 0.12;
  controls.target.set(0, 0.3, 0);
  controls.enablePan = true;
  scene.add(new THREE.HemisphereLight(0xfffbf3, 0x91887b, 2.1));
  const keyLight = new THREE.DirectionalLight(0xfff7e8, 3.4);
  keyLight.position.set(-1.8, 3, 2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = keyLight.shadow.camera.bottom = -1.8;
  keyLight.shadow.camera.right = keyLight.shadow.camera.top = 1.8;
  keyLight.shadow.normalBias = 0.002;
  scene.add(keyLight);
  const rim = new THREE.DirectionalLight(0xe3eeef, 2.6);
  rim.position.set(2, 1.5, -2);
  scene.add(rim);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: 0x665b4c, opacity: 0.18 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.004;
  floor.receiveShadow = true;
  scene.add(floor);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.65, 0.651, 128), new THREE.MeshBasicMaterial({ color: 0xc5bdb0, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.003;
  scene.add(ring);
  const root = new THREE.Group();
  scene.add(root);
  const panels = {};
  const hardware = [];
  const ghostMaterial = new THREE.MeshStandardMaterial({ color: 0xba6650, transparent: true, opacity: 0.1, depthWrite: false });
  const metal = () => new THREE.MeshStandardMaterial({ color: 0x858d8d, metalness: 0.73, roughness: 0.3 });
  const dowelMaterial = () => new THREE.MeshStandardMaterial({ color: 0xa57b49, roughness: 0.9 });
  const holeMaterial = new THREE.MeshStandardMaterial({ color: 0x4d4942, roughness: 1 });
  let currentKey = 'overview', progress = 1, exploded = false, xray = false, mode = 'floor';
  let disposed = false, frame, focused = false;
  const smooth = x => x * x * (3 - 2 * x);

  function mesh(geometry, material, parent = root) {
    const m = new THREE.Mesh(geometry, material);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function hole(parent, position, axis, radius = 0.0033) {
    const h = mesh(new THREE.CylinderGeometry(radius, radius, 0.0007, 16), holeMaterial, parent);
    h.position.copy(position);
    h.quaternion.setFromUnitVectors(V(0, 1, 0), axis);
  }
  function panel(id, size, pos, introduced, offset) {
    const material = new THREE.MeshStandardMaterial({ color: 0xf3eee4, roughness: 0.64, metalness: 0 });
    const group = new THREE.Group();
    const body = mesh(new RoundedBoxGeometry(...size, 3, 0.002), material, group);
    body.userData.name = names[id];
    group.position.copy(pos);
    root.add(group);
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)), new THREE.LineBasicMaterial({ color: 0xa29989, transparent: true, opacity: 0.19 }));
    group.add(outline);
    const ghost = mesh(new RoundedBoxGeometry(...size, 2, 0.002), ghostMaterial);
    ghost.position.copy(pos);
    panels[id] = { group, body, material, pos, introduced, offset, ghost };
    return group;
  }
  const d = 0.39, outer = 0.038, inner = 0.017, inside = 0.689, half = 0.336;
  panel('base', [0.765, outer, d], V(0, -0.3635, 0), 0, V());
  panel('left', [outer, inside, d], V(-0.3635, 0, 0), 1, V(0, 0.22, 0));
  panel('lower', [inner, half, d], V(0, -0.1765, 0), 2, V(0, 0.17, 0));
  panel('middle', [inside, inner, d], V(0, 0, 0), 3, V(0.25, 0, 0));
  panel('upper', [inner, half, d], V(0, 0.1765, 0), 5, V(0, 0.22, 0));
  panel('right', [outer, inside, d], V(0.3635, 0, 0), 7, V(0.22, 0, 0));
  panel('top', [0.765, outer, d], V(0, 0.3635, 0), 8, V(0, 0.24, 0));

  // Face markings retain the useful assembly cues without modelling internal panel construction.
  for (const side of ['left', 'right']) {
    const p = panels[side];
    const inward = side === 'left' ? 1 : -1;
    for (const z of [-0.145, 0.145]) hole(p.group, V(inward * 0.0194, 0, z), V(inward, 0, 0));
    for (const y of [0.301, 0.329]) hole(p.group, V(inward * 0.0195, y, -0.182), V(inward, 0, 0), 0.0018);
  }
  for (const id of ['base', 'top']) {
    const p = panels[id];
    const inward = id === 'base' ? 1 : -1;
    for (const z of [-0.145, 0.145]) hole(p.group, V(0, inward * 0.0194, z), V(0, inward, 0));
    for (const x of [-0.3635, 0.3635]) for (const z of [-0.145, 0.145]) hole(p.group, V(x, -inward * 0.0194, z), V(0, -inward, 0), 0.004);
  }
  for (const z of [-0.145, 0.145]) hole(panels.middle.group, V(0, 0.009, z), V(0, 1, 0));

  function addHardware(kind, position, axis, introduced, offset = axis.clone().multiplyScalar(0.065)) {
    const group = new THREE.Group();
    const material = kind === 'dowel' ? dowelMaterial() : metal();
    const length = kind === 'dowel' ? 0.038 : 0.065;
    const radius = kind === 'dowel' ? 0.0038 : 0.0025;
    const shaft = mesh(new THREE.CylinderGeometry(radius, radius, length, 16), material, group);
    shaft.userData.name = kind === 'dowel' ? 'Wooden dowel · 101339' : 'Long assembly screw';
    if (kind === 'screw') {
      const head = mesh(new THREE.CylinderGeometry(0.0054, 0.0054, 0.003, 12), material, group);
      head.position.y = length / 2;
      const socket = mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.0004, 6), holeMaterial, group);
      socket.position.y = length / 2 + 0.0017;
    }
    for (let k = 0; k < (kind === 'dowel' ? 6 : 9); k++) {
      const band = mesh(new THREE.TorusGeometry(radius + 0.0001, 0.00022, 3, 12), material, group);
      band.rotation.x = Math.PI / 2;
      band.position.y = (k - (kind === 'dowel' ? 2.5 : 4)) * 0.004;
    }
    group.quaternion.setFromUnitVectors(V(0, 1, 0), axis);
    root.add(group);
    hardware.push({ group, position, axis, introduced, offset, material, kind });
  }
  for (const z of [-0.145, 0.145]) {
    addHardware('screw', V(-0.3635, -0.35, z), V(0, -1, 0), 1);
    addHardware('dowel', V(0, -0.343, z), V(0, 1, 0), 2);
    addHardware('dowel', V(-0.343, 0, z), V(1, 0, 0), 3);
    addHardware('dowel', V(0, 0, z), V(0, 1, 0), 4);
    addHardware('dowel', V(0.343, 0, z), V(1, 0, 0), 6);
    addHardware('dowel', V(0, 0.343, z), V(0, 1, 0), 6);
    addHardware('screw', V(0.3635, -0.35, z), V(0, -1, 0), 8);
    addHardware('screw', V(-0.3635, 0.35, z), V(0, 1, 0), 8);
    addHardware('screw', V(0.3635, 0.35, z), V(0, 1, 0), 8);
  }

  const pads = new THREE.Group();
  root.add(pads);
  for (const x of [-0.33, 0.33]) for (const z of [-0.145, 0.145]) {
    const m = mesh(new THREE.BoxGeometry(0.025, 0.002, 0.025), new THREE.MeshStandardMaterial({ color: 0x8e877a, roughness: 1 }), pads);
    m.position.set(x, -0.384, z);
    m.userData.name = 'Self-adhesive pad · 1 of 4';
  }
  const brackets = new THREE.Group(), covers = new THREE.Group(), wallScrews = new THREE.Group(), wallMarks = new THREE.Group(), lockingPlates = new THREE.Group();
  root.add(brackets, covers, wallScrews, wallMarks, lockingPlates);
  const rearZ = -0.197, wallZ = -0.2;
  for (const x of [-0.3255, 0.3255]) {
    const bracket = new THREE.Group();
    const plateShape = new THREE.Shape();
    plateShape.moveTo(-0.019, -0.024); plateShape.lineTo(0.019, -0.024);
    plateShape.lineTo(0.019, 0.024); plateShape.lineTo(-0.019, 0.024); plateShape.closePath();
    const plateOpening = new THREE.Path();
    plateOpening.absarc(0, 0, 0.009, 0, Math.PI * 2, true);
    plateShape.holes.push(plateOpening);
    const plate = mesh(new THREE.ExtrudeGeometry(plateShape, { depth: 0.002, bevelEnabled: false }), metal(), bracket);
    plate.position.z = -0.001;
    const tongue = mesh(new THREE.BoxGeometry(0.011, 0.026, 0.003), metal(), bracket);
    tongue.position.set(0, 0.019, 0.001);
    const flange = mesh(new THREE.BoxGeometry(0.002, 0.048, 0.025), metal(), bracket);
    flange.position.set(x < 0 ? -0.019 : 0.019, 0, 0.012);
    for (const y of [-0.014, 0.014]) {
      const screw = mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.0025, 12), metal(), bracket);
      screw.rotation.z = Math.PI / 2;
      screw.position.set(x < 0 ? -0.019 : 0.019, y, 0.015);
    }
    bracket.position.set(x, 0.315, rearZ);
    bracket.userData.name = 'Wall attachment bracket · 2 furniture screws each';
    brackets.add(bracket);
    const cover = mesh(new RoundedBoxGeometry(0.044, 0.052, 0.029, 2, 0.002), new THREE.MeshStandardMaterial({ color: 0xf4f0e8 }), covers);
    cover.position.set(x, 0.315, -0.18);
    const lock = mesh(new THREE.BoxGeometry(0.022, 0.031, 0.0015), metal(), lockingPlates);
    lock.position.set(x, 0.315, rearZ + 0.002);
    lock.userData.name = 'Locking plate · 103693';
    const mark = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([V(-0.009, 0, 0), V(0.009, 0, 0), V(0, -0.009, 0), V(0, 0.009, 0)]), new THREE.LineBasicMaterial({ color: 0xb5573e }));
    mark.position.set(x, 0.315, wallZ + 0.0001);
    wallMarks.add(mark);
    const ws = mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.045, 16), metal(), wallScrews);
    ws.rotation.x = Math.PI / 2;
    ws.position.set(x, 0.315, rearZ - 0.021);
    const h = mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.003, 16), metal(), wallScrews);
    h.rotation.x = Math.PI / 2;
    h.position.set(x, 0.315, rearZ + 0.003);
  }
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.4), new THREE.MeshStandardMaterial({ color: 0xd6d2c7, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
  wall.position.set(0, 0.25, wallZ);
  root.add(wall);
  const arrow = new THREE.ArrowHelper(V(0, -1, 0), V(), 0.14, 0xb75e45, 0.025, 0.014);
  root.add(arrow);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerStart;
  canvas.addEventListener('pointerdown', e => { pointerStart = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => {
    if (!pointerStart || Math.hypot(e.clientX - pointerStart[0], e.clientY - pointerStart[1]) > 6) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(Object.values(panels).filter(p => p.group.visible).map(p => p.body))[0];
    if (hit) onPick?.(hit.object.userData.name);
  });

  function index() {
    if (currentKey === 'wallMark') return 11;
    if (currentKey === 'wallBrackets') return 10;
    if (currentKey === 'wallSecure') return 13;
    return Math.max(0, keys.indexOf(currentKey));
  }
  function update() {
    const n = index(), t = smooth(progress), overview = n === 0;
    const upright = overview || n >= 10;
    root.rotation.x = upright ? 0 : -Math.PI / 2;
    root.position.y = upright ? 0.387 + (mode === 'wall' && n >= 10 ? 0.16 : 0) : 0.2;
    const expand = exploded ? 0.18 : 0;
    floor.visible = !exploded;
    let active;
    for (const [id, p] of Object.entries(panels)) {
      p.group.visible = overview || n >= p.introduced;
      const isActive = p.introduced === n && !overview;
      if (isActive) active = p;
      p.group.position.copy(p.pos);
      if (isActive) p.group.position.addScaledVector(p.offset, 1 - t);
      if (expand) p.group.position.addScaledVector(p.pos.clone().normalize(), expand);
      p.material.color.set(isActive ? 0xc8795e : xray ? 0xa8b8ad : 0xf3eee4);
      p.material.transparent = xray && !isActive;
      p.material.opacity = xray && !isActive ? 0.1 : 1;
      p.material.depthWrite = !(xray && !isActive);
      p.body.castShadow = p.body.receiveShadow = !(xray && !isActive);
      p.material.needsUpdate = true;
      p.ghost.visible = isActive && progress < 0.96;
    }
    for (const h of hardware) {
      h.group.visible = !overview && n >= h.introduced;
      h.group.position.copy(h.position);
      if (h.introduced === n) h.group.position.addScaledVector(h.offset, 1 - t);
      if (expand) h.group.position.addScaledVector(h.position.clone().normalize(), expand);
      h.material.emissive.set(h.introduced === n ? 0x4c2717 : 0);
      h.material.color.set(h.introduced === n ? 0xb85d3f : h.kind === 'dowel' ? 0xa57b49 : 0x858d8d);
      if (h.kind === 'screw') h.group.quaternion.setFromUnitVectors(V(0, 1, 0), h.axis).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), h.introduced === n ? (1 - t) * Math.PI * 4 : 0));
    }
    pads.visible = n >= 9 && mode === 'floor' && !overview;
    pads.position.y = currentKey === 'pads' ? -(1 - t) * 0.1 : 0;
    brackets.visible = n >= 10 && !overview;
    covers.visible = (n >= 13 || currentKey === 'complete') && !overview;
    lockingPlates.visible = covers.visible;
    lockingPlates.position.y = covers.visible ? (1 - Math.min(1, t / 0.55)) * 0.09 : 0;
    covers.position.z = covers.visible ? (1 - t) * 0.12 : 0;
    covers.visible = covers.visible && progress > 0.65;
    wall.visible = (n >= 11 || (mode === 'wall' && n >= 10)) && !overview;
    wallMarks.visible = ['mark', 'wallMark'].includes(currentKey);
    wallMarks.scale.setScalar(0.2 + t * 0.8);
    wallScrews.visible = n >= 12 && !overview;
    const fixingOnly = currentKey === 'wallScrews';
    if (fixingOnly) {
      for (const p of Object.values(panels)) p.group.visible = p.ghost.visible = false;
      hardware.forEach(h => { h.group.visible = false; });
      pads.visible = brackets.visible = false;
      wallScrews.position.z = (1 - t) * 0.09;
    } else wallScrews.position.z = 0;
    if (currentKey === 'brackets' || currentKey === 'wallBrackets') brackets.position.z = (1 - t) * 0.12;
    else brackets.position.z = 0;
    arrow.visible = !!active && progress < 0.93 && !exploded;
    if (arrow.visible) {
      const direction = active.offset.clone().normalize().negate();
      arrow.setDirection(direction);
      arrow.position.copy(active.group.position).addScaledVector(direction, -0.13);
    }
  }
  let viewTween;
  function moveCamera(position, target, instant = false) {
    if (instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      camera.position.copy(position); controls.target.copy(target); controls.update(); return;
    }
    viewTween = { from: camera.position.clone(), to: position, targetFrom: controls.target.clone(), targetTo: target, start: performance.now() };
  }
  function setView(view = 'perspective', instant = false) {
    focused = false;
    const target = V(0, index() === 0 || index() >= 10 ? 0.41 : 0.2, 0);
    if (mode === 'wall' && index() >= 10) target.y += 0.16;
    const upright = index() === 0 || index() >= 10;
    const positions = { perspective: V(1.3, 1.2, 1.65), front: upright ? V(0, target.y + 0.04, 2.1) : V(0, 2.25, 0.01), back: V(-0.85, 1.05, -1.65) };
    moveCamera(positions[view] || positions.perspective, target, instant);
  }
  function focus() {
    focused = true;
    const n = index();
    const activeHardware = hardware.filter(h => h.introduced === n);
    let target = new THREE.Vector3();
    if (activeHardware.length) {
      activeHardware.sort((a, b) => root.localToWorld(a.group.position.clone()).distanceToSquared(camera.position) - root.localToWorld(b.group.position.clone()).distanceToSquared(camera.position));
      target.copy(activeHardware[0].group.position);
    }
    else {
      const active = Object.values(panels).find(p => p.introduced === n);
      target.copy(active ? active.group.position : V(-0.3255, 0.315, rearZ));
    }
    root.localToWorld(target);
    const direction = camera.position.clone().sub(controls.target).normalize();
    moveCamera(target.clone().addScaledVector(direction, n >= 10 ? 0.42 : 0.62), target);
  }
  const observer = new ResizeObserver(() => {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  observer.observe(canvas);
  function render(now) {
    if (disposed) return;
    frame = requestAnimationFrame(render);
    if (viewTween) {
      const t = smooth(Math.min(1, (now - viewTween.start) / 650));
      camera.position.lerpVectors(viewTween.from, viewTween.to, t);
      controls.target.lerpVectors(viewTween.targetFrom, viewTween.targetTo, t);
      if (t === 1) viewTween = undefined;
    }
    controls.update();
    renderer.render(scene, camera);
  }
  controls.addEventListener('start', () => { viewTween = undefined; });
  update(); setView('perspective', true); render(performance.now());
  return {
    setStep(key, nextMode = 'floor') {
      const wasUpright = index() === 0 || index() >= 10;
      currentKey = key; mode = nextMode; progress = 1; update();
      const nowUpright = index() === 0 || index() >= 10;
      const resetCamera = focused || wasUpright !== nowUpright;
      if (resetCamera) setView();
      return resetCamera;
    },
    setProgress(value) { progress = value; update(); },
    setExploded(value) { exploded = value; update(); },
    setXray(value) { xray = value; update(); },
    setView, focus,
    dispose() { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); renderer.dispose(); },
  };
}
