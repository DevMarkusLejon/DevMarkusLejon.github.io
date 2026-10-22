// Curves and connection positions are an illustration, not fabrication dimensions.
export function createModel({ THREE, root, V, part, box, fastener, show }) {
  root.scale.set(1, 1.015, 1.057);
  const birch = 0xc9a875, lightBirch = 0xddc394, steel = 0x89918d;
  const back = [], seat = [], outer = [], stretchers = [], screws = [], pins = [], washers = [], nuts = [], bolts = [], cushions = [];
  let current = 0;

  // A swept rectangle keeps the broad, laminated silhouette of bentwood.
  function bent(points, width, thickness, wide = V(1, 0, 0), segments = 60) {
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const vertices = [], indices = [];
    for (let i = 0; i <= segments; i++) {
      const p = curve.getPoint(i / segments), tangent = curve.getTangent(i / segments).normalize();
      const side = wide.clone().addScaledVector(tangent, -wide.dot(tangent)).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, side).normalize();
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const corner = p.clone().addScaledVector(side, a * width / 2).addScaledVector(normal, b * thickness / 2);
        vertices.push(corner.x, corner.y, corner.z);
      }
      if (i < segments) for (let j = 0; j < 4; j++) {
        const a = i * 4 + j, b = i * 4 + (j + 1) % 4, c = b + 4, d = a + 4;
        indices.push(a, b, d, b, c, d);
      }
    }
    indices.push(0, 2, 1, 0, 3, 2);
    const end = segments * 4;
    indices.push(end, end + 1, end + 2, end, end + 2, end + 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    return geometry;
  }
  function curved(name, coords, width, thickness, position, wide = V(1, 0, 0), color = birch) {
    return part(name, bent(coords.map(p => V(...p)), width, thickness, wide), position, color);
  }
  function addScrew(name, position, axis, kind, length, step, side) {
    const p = fastener(name, position, axis, kind, length);
    p.step = step; p.side = side; screws.push(p); return p;
  }
  function ring(name, position, side) {
    const p = part(name, new THREE.TorusGeometry(0.0055, 0.002, 8, 20), position, 0x363c36);
    p.rotation.y = Math.PI / 2; p.side = side; p.hardware = true; return p;
  }
  const backShape = [[0, 0.333, -0.16], [0, 0.39, -0.175], [0, 0.49, -0.218], [0, 0.61, -0.265], [0, 0.77, -0.35], [0, 0.928, -0.386]];
  for (const side of [-1, 1]) {
    const p = curved(`${side < 0 ? 'Left' : 'Right'} back-side rail`, backShape, 0.036, 0.026, V(side * 0.271, 0, 0));
    p.side = side; p.step = side < 0 ? 1 : 2; back.push(p);
  }
  const backLevels = [[0.443, -0.199], [0.608, -0.264], [0.777, -0.352], [0.916, -0.384]];
  backLevels.forEach(([y, z], level) => {
    const p = curved(`Back crossbar ${level + 1}${level === 2 ? ' · cushion strip' : ''}`,
      [[-0.259, 0, 0], [0, 0, -0.018], [0.259, 0, 0]], 0.036, 0.012, V(0, y, z), V(0, 1, 0), lightBirch);
    p.step = 1; back.push(p);
    for (const side of [-1, 1]) addScrew('Back screw · 119046 / 123257', V(side * 0.279, y, z), V(side, 0, 0), 'screw', 0.022, side > 0 ? 3 : 4, side);
  });
  const strip = curved('Cushion fastening strip', [[-0.225, 0, 0], [0, 0, -0.015], [0.225, 0, 0]], 0.025, 0.002,
    V(0, backLevels[2][0], backLevels[2][1] + 0.0075), V(0, 1, 0), 0x777865);
  strip.step = 1; back.push(strip);

  for (const side of [-1, 1]) {
    const p = curved(`${side < 0 ? 'Left' : 'Right'} seat-side rail`, [[0, 0.335, -0.168], [0, 0.341, 0.02], [0, 0.354, 0.34]],
      0.038, 0.024, V(side * 0.27, 0, 0));
    p.step = 5; seat.push(p);
    addScrew('Back-to-seat screw · 120925 / 150450', V(side * 0.279, 0.349, -0.168), V(side, 0, 0), 'screw', 0.03, 5, side);
  }
  function fabricGeometry() {
    const geometry = new THREE.PlaneGeometry(0.528, 0.508, 20, 20), positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getY(i) + 0.086;
      const y = 0.34 + (z + 0.168) * 0.04 - 0.012 * (1 - (x / 0.264) ** 2);
      positions.setXYZ(i, x, y, z);
    }
    geometry.computeVertexNormals(); return geometry;
  }
  const fabric = part('Fabric seat deck · separate from the cushion', fabricGeometry(), V(), 0x8a8677, { side: THREE.DoubleSide, roughness: 1 });
  fabric.step = 5; seat.push(fabric);
  const seatBars = [];
  for (const [y, z, label] of [[0.335, -0.168, 'Rear'], [0.354, 0.34, 'Front']]) {
    const p = curved(`${label} curved seat crossbar`, [[-0.268, 0, 0], [0, -0.014, 0], [0.268, 0, 0]],
      0.028, 0.012, V(0, y - 0.008, z), V(0, 0, 1), lightBirch);
    p.step = 6; seatBars.push(p);
    for (const side of [-1, 1]) addScrew('Seat crossbar screw · 120925 / 150450', V(side * 0.268, y + 0.002, z), V(0, 1, 0), 'screw', 0.026, 7, side);
  }

  const armShape = [[0, 0.531, -0.235], [0, 0.562, -0.16], [0, 0.587, -0.025], [0, 0.593, 0.16], [0, 0.577, 0.295],
    [0, 0.535, 0.351], [0, 0.435, 0.34], [0, 0.18, 0.34], [0, 0.072, 0.331], [0, 0.029, 0.28], [0, 0.024, 0.13], [0, 0.024, -0.2], [0, 0.024, -0.395]];
  for (const side of [-1, 1]) {
    const p = curved(`${side < 0 ? 'Left' : 'Right'} bentwood arm and runner`, armShape, 0.038, 0.027, V(side * 0.321, 0, 0));
    p.side = side; p.step = side > 0 ? 8 : 10; outer.push(p);
    const pin = part('Front seat connector pin · 123786', new THREE.CylinderGeometry(0.004, 0.004, 0.045, 18), V(side * 0.294, 0.354, 0.34), steel, { metalness: 0.65, roughness: 0.35 });
    pin.rotation.z = -side * Math.PI / 2; pin.side = side; pin.step = p.step;
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.002, 18), pin.material); pin.group.add(flange); pins.push(pin);
    const washer = ring('Rear arm spacer washer · 102319', V(side * 0.295, 0.531, -0.235), side);
    washer.step = p.step; washers.push(washer);
    const bolt = fastener('Medium rear arm bolt · 146654 / 146655', V(side * 0.309, 0.531, -0.235), V(side, 0, 0), 'screw', 0.06);
    bolt.side = side; bolt.step = p.step; bolts.push(bolt);
  }
  const stretcherDowels = [];
  const stretcherPositions = [[0.294, 0.34, 0.058, 'Front lower stretcher'], [0.027, -0.37, 0.027, 'Rear lower stretcher']];
  for (const [y, z, height, label] of stretcherPositions) {
    const p = box(label, [0.603, height, 0.028], V(0, y, z), birch); stretchers.push(p);
    for (const side of [-1, 1]) {
      for (const dy of [-height * 0.27, height * 0.27]) {
        const dowel = fastener('Existing stretcher locating dowel', V(side * 0.307, y + dy, z), V(side, 0, 0), 'dowel', 0.018);
        dowel.side = side; stretcherDowels.push(dowel);
      }
      const nut = part('Stretcher barrel nut · 100514', new THREE.CylinderGeometry(0.005, 0.005, 0.014, 18), V(side * 0.275, y, z + 0.006), steel, { metalness: 0.65, roughness: 0.35 });
      nut.rotation.x = Math.PI / 2; nut.side = side; nut.step = side > 0 ? 9 : 11; nuts.push(nut);
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.0006, 0.001), new THREE.MeshBasicMaterial({ color: 0x343c37 }));
      slot.position.y = 0.0074; nut.group.add(slot);
      const bolt = fastener('Long stretcher bolt · 122606 / 122604', V(side * 0.301, y, z), V(side, 0, 0), 'screw', 0.078);
      bolt.side = side; bolt.step = nut.step; bolts.push(bolt);
    }
  }
  const cushionColor = 0x688174;
  const cushionSeat = box('Compatible POÄNG seat cushion · sold separately', [0.537, 0.064, 0.50], V(0, 0.386, 0.086), cushionColor);
  cushions.push(cushionSeat);
  const cushionBack = curved('Compatible POÄNG back cushion', [[0, 0.415, -0.144], [0, 0.53, -0.195], [0, 0.66, -0.267], [0, 0.8, -0.332], [0, 0.927, -0.355]],
    0.526, 0.047, V(), V(1, 0, 0), cushionColor);
  cushions.push(cushionBack);
  const cushionStrip = curved('Cushion backing fastening strip', [[-0.22, 0, 0], [0, 0, -0.015], [0.22, 0, 0]], 0.025, 0.002,
    V(0, backLevels[2][0], backLevels[2][1] + 0.0105), V(0, 1, 0), 0x777865);

  function update({ index, t, exploded }) {
    current = index;
    const overview = index === 0 || index === 14;
    const e = exploded ? 1 : 0;
    const appears = step => overview || index >= step;
    const move = (step, offset) => index === step ? offset.clone().multiplyScalar(1 - t) : V();
    const isFirstSide = index <= 3 || index === 8 || index === 9;
    const isSecondSide = index === 4 || index === 10 || index === 11;
    root.position.y = -0.0106;
    if (index > 0 && (isFirstSide || isSecondSide)) {
      const side = isFirstSide ? 1 : -1;
      root.rotation.z = side * Math.PI / 2;
      root.position.set(side * (index < 5 ? 0.63 : 0.46), index < 5 ? 0.29 : 0.34, 0);
    }
    for (const p of back) if (appears(p.step)) {
      const offset = p.side ? V(p.side * e * 0.10, 0, 0) : V(0, 0, -e * 0.06);
      if (p.side > 0) offset.add(move(2, V(0.22, 0, 0)));
      if (!p.side) offset.add(move(1, V(0.18, 0, 0)));
      show(p, index === p.step && p !== strip, offset);
    }
    for (const p of seat) if (appears(5)) show(p, index === 5, move(5, V(0, 0, 0.22)).add(V(0, 0, e * 0.09)));
    for (const p of seatBars) if (appears(6)) show(p, index === 6, move(6, V(-0.56, 0, 0)).add(V(0, -e * 0.08, e * 0.09)));
    for (const p of screws) if (appears(p.step)) {
      const axis = p.step === 7 ? V(0, 1, 0) : V(p.side, 0, 0);
      const offset = move(p.step, axis.multiplyScalar(0.065));
      offset.add(p.step < 5 ? V(p.side * e * 0.10, 0, 0) : V(0, 0, e * 0.09));
      show(p, index === p.step, offset);
    }
    for (const p of outer) if (appears(p.step)) show(p, index === p.step, move(p.step, V(p.side * 0.21, 0, 0)).add(V(p.side * e * 0.16, 0, 0)));
    for (const p of pins) if (appears(p.step)) show(p, index === p.step, move(p.step, V(p.side * 0.11, 0, 0)).add(V(p.side * e * 0.08, 0, 0)));
    for (const p of washers) if (appears(p.step)) show(p, index === p.step, move(p.step, V(p.side * 0.11, 0, 0)).add(V(p.side * e * 0.08, 0, 0)));
    for (const p of stretchers) if (appears(9)) show(p, index === 9, move(9, V(-0.20, 0, 0)).add(V(0, -e * 0.04, 0)));
    for (const p of stretcherDowels) if (appears(9)) show(p, false, move(9, V(-0.20, 0, 0)).add(V(0, -e * 0.04, 0)));
    for (const p of nuts) if (appears(p.step)) show(p, index === p.step, move(p.step, V(0, 0, 0.07)).add(V(0, -e * 0.04, 0)));
    for (const p of bolts) if (appears(p.step)) show(p, index === p.step || index === 12,
      move(p.step, V(p.side * 0.15, 0, 0)).add(V(p.side * e * 0.16, 0, 0)));
    if (index >= 13) {
      for (const p of cushions) show(p, false, move(13, V(0, 0.10, 0.23)).add(V(0, e * 0.12, e * 0.12)));
      show(cushionStrip, index === 13, move(13, V(0, 0.10, 0.23)).add(V(0, e * 0.12, e * 0.12)));
      if (index === 13) show(strip, true, V(0, 0, -e * 0.06));
    }
  }
  function camera(index) {
    if (index > 0 && index <= 4) return { key: `back-${index === 4 ? 'flipped' : 'first'}`, position: V(1.05, 1.40, 1.65), target: V(0, 0.29, -0.28), front: V(0, 1.80, -0.27), back: V(-1.1, 1.2, -1.8) };
    if (index === 8 || index === 9) return { key: 'first-side', position: V(1.25, 1.55, 1.8), target: V(0, 0.34, -0.02), front: V(0, 1.95, 0.05) };
    if (index === 10 || index === 11) return { key: 'second-side', position: V(-1.25, 1.55, 1.8), target: V(0, 0.34, -0.02), front: V(0, 1.95, 0.05) };
    return { key: 'upright', position: V(1.40, 1.16, 1.85), target: V(0, 0.46, -0.04), front: V(0, 0.58, 2.25), back: V(-1.3, 1.1, -1.9) };
  }
  function focus(index = current) {
    let piece;
    if (index === 1 || index === 2) return {
      target: root.localToWorld(V(index === 1 ? -0.26 : 0.26, 0.608, -0.264)), distance: 0.55, direction: V(0.6, 1, 0.6)
    };
    else if (index <= 7 && index >= 3) piece = index === 6 ? seatBars[1] : screws.find(p => p.step === index);
    else if (index === 8 || index === 10) piece = washers.find(p => p.step === index);
    else if (index === 9 || index === 11) piece = nuts.find(p => p.step === index);
    else if (index === 12) piece = bolts.find(p => p.step === 8);
    else if (index === 13) piece = strip;
    if (!piece) return { target: V(0, 0.47, 0), distance: 1.5, direction: V(1, 0.6, 1.2) };
    return { piece, distance: index <= 2 || index === 6 ? 0.72 : index === 13 ? 0.5 : 0.3,
      direction: index === 10 || index === 11 ? V(-0.6, 1, 1) : index >= 8 && index <= 9 ? V(0.6, 1, 1) : V(1, 0.7, 1) };
  }
  return { update, camera, focus };
}
