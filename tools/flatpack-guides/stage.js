import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export function createStage(canvas, build, onPick) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(), root = new THREE.Group();
  scene.add(root);
  scene.add(new THREE.HemisphereLight(0xfffbf3, 0x91887b, 2.1));
  const light = new THREE.DirectionalLight(0xfff7e8, 3.4);
  light.position.set(-2.4, 4, 3); light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.camera.left = light.shadow.camera.bottom = -3;
  light.shadow.camera.right = light.shadow.camera.top = 3;
  light.shadow.normalBias = 0.0015;
  scene.add(light);
  const rim = new THREE.DirectionalLight(0xe3eeef, 2.6);
  rim.position.set(2, 2.8, -2); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.ShadowMaterial({ color: 0x665b4c, opacity: 0.17 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.004; floor.receiveShadow = true; scene.add(floor);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 30);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.09;
  controls.minDistance = 0.12; controls.maxDistance = 8;
  controls.maxPolarAngle = Math.PI / 2 + 0.15;
  const pieces = [];
  let index = 0, progress = 1, exploded = false, xray = false, focused = false, tween;
  const smooth = n => n * n * (3 - 2 * n);
  function part(name, geometry, position = V(), color = 0xf3eee4, options = {}) {
    const group = new THREE.Group(), material = new THREE.MeshStandardMaterial({ color, roughness: 0.64, ...options });
    const body = new THREE.Mesh(geometry, material);
    body.castShadow = body.receiveShadow = true; body.userData.name = name;
    group.add(body); root.add(group);
    const p = { name, group, body, material, color, position, hardware: material.metalness > 0.3, rotation: new THREE.Euler() };
    pieces.push(p); return p;
  }
  const box = (name, size, position, color, options) => part(name, new RoundedBoxGeometry(...size, 2, 0.001), position, color, options);
  function fastener(name, position, axis = V(0, 1, 0), kind = 'screw', length = 0.03) {
    const wood = kind === 'dowel', radius = wood ? 0.004 : kind === 'nail' ? 0.001 : 0.003;
    const p = part(name, new THREE.CylinderGeometry(radius, radius, length, 12), position, wood ? 0xab8353 : 0x858d8d, { metalness: wood ? 0 : 0.65, roughness: wood ? 0.9 : 0.35 });
    p.hardware = true;
    p.rotation.setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), axis));
    if (!wood && kind !== 'double') {
      const head = new THREE.Mesh(new THREE.CylinderGeometry(kind === 'nail' ? 0.0025 : 0.005, kind === 'nail' ? 0.0025 : 0.005, 0.002, 16), p.material);
      head.position.y = length / 2; p.group.add(head);
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.0006, 0.001), new THREE.MeshBasicMaterial({ color: 0x434b45 }));
      slot.position.y = length / 2 + 0.0012; p.group.add(slot);
    }
    for (let i = 0; i < 6; i++) {
      const ridge = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.00035, 3, 12), p.material);
      ridge.rotation.x = Math.PI / 2; ridge.position.y = (i - 2.5) * length / 7; p.group.add(ridge);
    }
    return p;
  }
  function show(p, active = false, offset = V(), rotation) {
    p.group.visible = true; p.group.position.copy(p.position).add(offset);
    p.group.rotation.copy(rotation || p.rotation);
    p.material.color.set(active ? 0xc8795e : p.color);
    const transparent = xray && !p.hardware;
    if (p.material.transparent !== transparent) { p.material.transparent = transparent; p.material.needsUpdate = true; }
    p.material.opacity = transparent ? 0.12 : 1;
    p.material.depthWrite = !transparent;
    p.body.castShadow = p.body.receiveShadow = !transparent;
  }
  const model = build({ THREE, root, scene, V, part, box, fastener, show, pieces });
  function update() {
    pieces.forEach(p => { p.group.visible = false; });
    root.position.set(0, 0, 0); root.rotation.set(0, 0, 0);
    floor.visible = !exploded;
    model.update({ index, t: smooth(progress), progress, exploded, xray });
    root.updateMatrixWorld(true);
  }
  function move(position, target, instant = false) {
    if (instant || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      tween = undefined; camera.position.copy(position); controls.target.copy(target); controls.update(); return;
    }
    tween = { start: performance.now(), from: camera.position.clone(), to: position, targetFrom: controls.target.clone(), targetTo: target };
  }
  function setView(view = 'perspective', instant = false) {
    focused = false;
    const c = model.camera(index);
    const position = view === 'front' ? c.front || V(0, c.target.y, c.position.length()) : view === 'back' ? c.back || V(-c.position.x, c.position.y, -c.position.z) : c.position;
    move(position, c.target, instant);
  }
  function focus() {
    const f = model.focus?.(index);
    if (!f) return;
    focused = true;
    const target = f.target || f.piece.group.getWorldPosition(V());
    const direction = f.direction || camera.position.clone().sub(controls.target).normalize();
    move(target.clone().addScaledVector(direction.clone().normalize(), f.distance || 0.38), target);
  }
  let pointerDown;
  const raycaster = new THREE.Raycaster();
  canvas.addEventListener('pointerdown', e => { pointerDown = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => {
    if (!pointerDown || Math.hypot(e.clientX - pointerDown[0], e.clientY - pointerDown[1]) > 6) return;
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), camera);
    const visible = pieces.filter(p => { for (let parent = p.group; parent; parent = parent.parent) if (!parent.visible) return false; return true; });
    const hit = raycaster.intersectObjects(visible.map(p => p.body))[0];
    if (hit) onPick?.(hit.object.userData.name);
  });
  const observer = new ResizeObserver(() => {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.render(scene, camera);
  });
  observer.observe(canvas);
  let frame;
  function render(now) {
    frame = requestAnimationFrame(render);
    if (tween) {
      const t = smooth(Math.min(1, (now - tween.start) / 550));
      camera.position.lerpVectors(tween.from, tween.to, t); controls.target.lerpVectors(tween.targetFrom, tween.targetTo, t);
      if (t === 1) tween = undefined;
    }
    controls.update(); renderer.render(scene, camera);
  }
  controls.addEventListener('start', () => { tween = undefined; });
  update(); setView('perspective', true); render(performance.now());
  return {
    setStep(next) { const key = model.camera(index).key; index = next; progress = 1; update(); const reset = focused || key !== model.camera(index).key; if (reset) setView(); return reset; },
    setProgress(value) { progress = value; update(); },
    setExploded(value) { exploded = value; update(); },
    setXray(value) { xray = value; update(); },
    setView, focus,
    dispose() { cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); renderer.dispose(); },
  };
}
