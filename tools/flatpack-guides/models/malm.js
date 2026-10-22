export function createModel({ THREE, root, V, part, box, fastener, show }) {
  const white = 0xf4f1e9, metal = 0x929e9e, raw = 0xb5a58b;
  const body = new THREE.Group(); root.add(body);
  const boards = [], fittings = [], drawerSets = [];
  const place = (p, parent = body) => { parent.add(p.group); return p; };
  function board(name, size, position, start, color = white) {
    const p = place(box(name, size, V(...position), color));
    p.start = start; boards.push(p); return p;
  }
  function attach(p, owner, start, list = fittings) {
    owner.group.add(p.group); p.start = start; list.push(p); return p;
  }
  function screw(owner, name, position, axis, start, kind = 'screw', length = .025, list = fittings) {
    return attach(fastener(name, V(...position), V(...axis), kind, length), owner, start, list);
  }
  function cam(owner, position, axis, start, list = fittings) {
    const p = part('Cam lock · 117434 / 119030 / 120076', new THREE.CylinderGeometry(.008, .008, .011, 24), V(...position), metal, { metalness: .55 });
    p.rotation.setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), V(...axis)));
    const slot = new THREE.Mesh(new THREE.BoxGeometry(.011, .0008, .0014), new THREE.MeshBasicMaterial({ color: 0x475750 }));
    slot.position.y = .006; p.group.add(slot);
    return attach(p, owner, start, list);
  }
  function washer(owner, position, axis, start, list = fittings) {
    const p = part('Washer · 100823', new THREE.TorusGeometry(.005, .0015, 5, 20), V(...position), metal, { metalness: .6 });
    p.rotation.setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), V(...axis)));
    return attach(p, owner, start, list);
  }
  function detail(owner, geometry, position, color = metal, rotation) {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: .5, metalness: color === metal ? .6 : 0 }));
    mesh.position.set(...position); if (rotation) mesh.rotation.set(...rotation);
    mesh.castShadow = true; owner.group.add(mesh); return mesh;
  }

  const left = board('Left side · cabinet runners pre-fitted', [.02, .745, .456], [-.39, -.0105, -.008], 1);
  const right = board('Right side · cabinet runners pre-fitted', [.02, .745, .456], [.39, -.0105, -.008], 12);
  const plinth = board('Front plinth', [.76, .07, .018], [0, -.3485, .219], 3);
  const rails = [.331, .103, -.125].map((y, i) => board(`Front rail ${i + 1}`, [.76, .038, .018], [0, y, .211], 6));
  const bottom = board('Bottom panel · cam holes toward rear', [.76, .018, .43], [0, -.29, -.004], 8);
  const rearRail = board('Lower rear support rail', [.76, .17, .018], [0, -.295, -.215], 10, raw);
  const top = board('Top panel · front edge faces forward', [.8, .028, .48], [0, .376, 0], 15);
  const boltYs = [...rails.map(p => p.position.y), bottom.position.y, rearRail.position.y];
  const boltZs = [.211, .211, .211, -.11, -.215];
  [left, right].forEach((side, sideIndex) => {
    const sign = sideIndex ? -1 : 1;
    boltYs.forEach((y, i) => screw(side, 'Case cam bolt · 118331', [sign * .018, y - side.position.y, boltZs[i] - side.position.z], [sign, 0, 0], 1, 'screw', .028));
    [.236, .008, -.22].forEach((y, i) => {
      const runner = attach(box(`Pre-fitted cabinet runner ${i + 1}`, [.012, .024, .415], V(sign * .015, y - .079 - side.position.y, .005), metal), side, 1);
      runner.prefitted = true;
      detail(runner, new THREE.BoxGeometry(.022, .004, .415), [sign * .006, -.01, 0]);
      detail(runner, new THREE.CylinderGeometry(.013, .013, .008, 20), [sign * .007, -.006, .188], 0xd3d4c8, [0, 0, Math.PI / 2]);
    });
    [-.18, .18].forEach(z => {
      const pad = attach(box('Side foot pad · 153548 / 158568', [.022, .007, .046], V(0, -.376, z), 0xc5c1b2), side, 2);
      pad.entry = V(0, -1, 0);
    });
    [-.16, .16].forEach(z => cam(side, [sign * .009, .3415, z], [sign, 0, 0], 18));
  });
  [-.30, .30].forEach(x => {
    const pad = attach(box('Plinth foot pad · 153548 / 158568', [.046, .007, .022], V(x, -.038, 0), 0xc5c1b2), plinth, 4);
    pad.entry = V(0, -1, 0);
  });
  const plinthBrackets = [-1, 1].map(sign => {
    const bracket = attach(box('Plinth angle bracket · 10038685', [.031, .044, .002], V(sign * .363, 0, -.011), metal), plinth, 3);
    bracket.entry = V(0, 0, -1);
    detail(bracket, new THREE.BoxGeometry(.002, .044, .03), [sign * .016, 0, -.014]);
    [-.012, .012].forEach(y => {
      screw(bracket, 'Plinth bracket screw · 155669', [0, y, 0], [0, 0, -1], 3, 'screw', .012);
      screw(bracket, 'Side bracket screw · 155669', [sign * .014, y, -.017], [-sign, 0, 0], sign < 0 ? 5 : 13, 'screw', .012);
    });
    return bracket;
  });
  [...rails, bottom, rearRail].forEach((p, i) => {
    [-1, 1].forEach(sign => {
      const zs = i < 3 ? [0] : i === 3 ? [-.16, .14] : [0, 0];
      zs.forEach((z, j) => screw(p, 'Case wooden dowel · 101345', [sign * .383, i === 4 ? (j ? .055 : -.055) : 0, z], [sign, 0, 0], p.start, 'dowel', .03));
      const axis = i === 3 ? [0, -1, 0] : [0, 0, -1];
      cam(p, [sign * .351, i === 3 ? -.01 : 0, i === 3 ? -.106 : -.01], axis, sign < 0 ? (i < 3 ? 7 : i === 3 ? 9 : 11) : 14);
    });
  });
  [-.39, .39].forEach(x => [-.16, .16].forEach(z => {
    screw(top, 'Top cam bolt · 118331', [x, -.027, z], [0, -1, 0], 15, 'screw', .028);
    screw(x < 0 ? left : right, 'Top wooden dowel · 101345', [0, .3725, z > 0 ? .11 : -.11], [0, 1, 0], 17, 'dowel', .03);
  }));
  const restraints = [-.3, .3].map(x => {
    const bracket = attach(box('Slotted wall restraint · 106989', [.03, .003, .065], V(x, -.016, -.212), metal), top, 16);
    bracket.entry = V(0, -1, 0);
    detail(bracket, new THREE.BoxGeometry(.03, .071, .003), [0, -.034, -.031]);
    detail(bracket, new THREE.BoxGeometry(.004, .025, .0007), [0, -.038, -.033], 0x475750);
    screw(bracket, 'Furniture restraint screw · 109049', [0, .004, .011], [0, -1, 0], 16, 'screw', .018);
    washer(bracket, [0, -.003, .011], [0, 1, 0], 16);
    screw(bracket, 'Wall screw · 109048', [0, -.038, -.044], [0, 0, 1], 28, 'screw', .055);
    washer(bracket, [0, -.038, -.028], [0, 0, 1], 28);
    return bracket;
  });
  const back = [-1, 1].map(sign => {
    const shape = new THREE.Shape();
    const points = sign < 0 ? [[-.19, -.285], [.19, -.285], [.19, .285], [-.14, .285], [-.14, .255], [-.19, .255]] : [[-.19, -.285], [.19, -.285], [.19, .255], [.14, .255], [.14, .285], [-.19, .285]];
    points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y)); shape.closePath();
    const p = place(part('Folding back panel · two sections', new THREE.ExtrudeGeometry(shape, { depth: .003, bevelEnabled: false }), V(sign * .19, .068, -.239), raw));
    p.start = 19; boards.push(p); return p;
  });
  const nailPoints = [[-.32, .343], [.32, .343], [-.36, -.21]];
  for (let i = 0; i < 6; i++) nailPoints.push([-.27 + i * .108, .343]);
  for (let i = 0; i < 7; i++) nailPoints.push([-.27 + i * .105, -.21]);
  for (const x of [-.375, .375]) for (let i = 0; i < 7; i++) nailPoints.push([x, -.14 + i * .07]);
  const nails = nailPoints.map(([x, y], i) => {
    const p = place(fastener('Back nail · 101221', V(x, y, -.23), V(0, 0, -1), 'nail', .023));
    p.start = i < 3 ? 19 + i : 22; return p;
  });
  const wall = place(part('Wall · choose fixing method in original IKEA drawing', new THREE.PlaneGeometry(1.55, 1.25), V(0, .625, -.244), 0xe3dfd2), root);
  const marks = [-.3, .3].flatMap(x => [[.016, .001, .001], [.001, .016, .001]].map(size => place(box('Marked wall fixing position', size, V(x, .712, -.243), 0xc8795e), root)));

  function makeDrawer(number) {
    const group = new THREE.Group(); root.add(group);
    const panels = [], hardware = [];
    const panel = (name, size, position, start, color = white) => {
      const p = place(box(name, size, V(...position), color), group); p.start = start; panels.push(p); return p;
    };
    const front = panel(`Drawer ${number} front`, [.792, .224, .018], [0, 0, .235], 29);
    const sides = [-1, 1].map(sign => panel(`Drawer ${number} ${sign < 0 ? 'left' : 'right'} side`, [.016, .16, .43], [sign * .368, -.014, .011], 30));
    const base = panel(`Drawer ${number} bottom · keep in grooves`, [.728, .003, .427], [0, -.096, .011], 32);
    const rear = panel(`Drawer ${number} back · brace notch at bottom`, [.72, .16, .014], [0, -.014, -.197], 33);
    [-1, 1].forEach((sign, si) => [-.052, .052].forEach(y => {
      screw(front, 'Drawer cam bolt · 118331', [sign * .368, y, -.022], [0, 0, -1], 29, 'screw', .027, hardware);
      screw(sides[si], 'Drawer dowel · 101345', [0, y * .48, .219], [0, 0, 1], 30, 'dowel', .03, hardware);
      cam(sides[si], [sign * .009, y + .014, .173], [sign, 0, 0], 31, hardware);
      screw(sides[si], 'Hammer-in fastener · 110519', [sign * .007, y + .014, -.208], [sign, 0, 0], 34, 'screw', .022, hardware);
    }));
    sides.forEach((side, i) => {
      const sign = i ? 1 : -1;
      screw(side, 'Short round-head fitting · 115339', [sign * .012, -.05, .134], [sign, 0, 0], 34, 'screw', .006, hardware);
      const runner = attach(box('Drawer runner · 118790 / 148601', [.012, .017, .421], V(sign * .013, -.075, 0), metal), side, 35, hardware);
      runner.entry = V(0, -1, 0);
      detail(runner, new THREE.BoxGeometry(.022, .003, .421), [-sign * .006, -.007, 0]);
      detail(runner, new THREE.CylinderGeometry(.013, .013, .009, 24), [sign * .004, -.002, -.192], 0xcdd2ca, [0, 0, Math.PI / 2]);
      [-.15, 0, .15].forEach(z => screw(side, 'Runner screw · 100365', [sign * .019, -.075, z], [sign, 0, 0], 35, 'screw', .01, hardware));
    });
    const brace = panel('Drawer-bottom centre brace · 123833', [.018, .006, .431], [0, -.106, .014], 36, metal);
    detail(brace, new THREE.BoxGeometry(.018, .022, .003), [0, .008, -.214]);
    detail(brace, new THREE.BoxGeometry(.018, .015, .003), [0, .005, .214]);
    screw(brace, 'Bottom brace screw · 105344', [0, .008, -.213], [0, 0, -1], 36, 'screw', .013, hardware);
    screw(brace, 'Bottom brace screw · 105344', [0, .007, .214], [0, 0, -1], 36, 'screw', .013, hardware);
    if (number === 1) {
      const label = new THREE.Mesh(new THREE.PlaneGeometry(.075, .035), new THREE.MeshBasicMaterial({ color: 0xe5b766, side: THREE.DoubleSide }));
      label.position.set(.009, .015, .1); label.rotation.y = Math.PI / 2; sides[0].group.add(label);
      const triangle = new THREE.Shape(); triangle.moveTo(-.009, -.009); triangle.lineTo(.009, -.009); triangle.lineTo(0, .009); triangle.closePath();
      const symbol = new THREE.Mesh(new THREE.ShapeGeometry(triangle), new THREE.MeshBasicMaterial({ color: 0x393e33, side: THREE.DoubleSide }));
      symbol.position.set(.0095, .015, .1); symbol.rotation.y = Math.PI / 2; sides[0].group.add(symbol);
    }
    return { group, panels, hardware, front, sides, base, rear, brace };
  }
  for (let i = 1; i <= 3; i++) drawerSets.push(makeDrawer(i));

  const isDrawer = i => i >= 29 && i <= 36;
  function update({ index, t, exploded }) {
    const all = index === 0 || index >= 37;
    body.visible = !isDrawer(index);
    body.position.set(0, .39, 0); body.rotation.set(0, 0, 0);
    drawerSets.forEach(d => { d.group.visible = false; });
    if (index >= 5 && index <= 14) { body.rotation.z = Math.PI / 2; body.position.y = .401; }
    if (index >= 19 && index <= 22) { body.rotation.x = Math.PI / 2; body.position.y = .245; }
    if (index === 24) body.position.z = .42 * t;
    if (index >= 25 && index <= 27) body.position.z = .42;
    if (index === 28) body.position.z = .42 * (1 - t);
    if (index === 1 || index === 2 || index === 3 || index === 4 || index === 15 || index === 16) body.position.y = .015;

    boards.forEach(p => {
      let visible = all || index >= p.start;
      if (index <= 2 && index > 0) visible = p === left || p === right;
      if (index === 3 || index === 4) visible = p === plinth;
      if (index >= 5 && index <= 11 && p === right) visible = false;
      if (index === 15 || index === 16) visible = p === top;
      if (!visible || isDrawer(index)) return;
      let offset = V(), rotation;
      const active = index === p.start || (p === plinth && index === 5) || (p === top && index === 17);
      if (index <= 2 && index > 0) {
        rotation = new THREE.Euler(0, 0, p === left ? Math.PI / 2 : -Math.PI / 2);
        const pos = V(p === left ? -.42 : .42, 0, 0); offset.copy(pos).sub(p.position);
      } else if ((index === 3 || index === 4) && p === plinth) {
        offset.copy(p.position).negate(); rotation = new THREE.Euler(Math.PI / 2, 0, 0);
      } else if ((index === 15 || index === 16) && p === top) {
        offset.copy(p.position).negate(); rotation = new THREE.Euler(Math.PI, 0, 0);
      } else if (active && index >= 5 && index <= 12) offset.x = .22 * (1 - t);
      if (index === 17 && p === top) offset.y = .22 * (1 - t);
      if (index === 19 && back.includes(p)) {
        const sign = p === back[0] ? -1 : 1;
        const angle = Math.PI * .38 * Math.max(0, 1 - t * 2);
        rotation = new THREE.Euler(0, -sign * angle, 0);
        offset.x = sign * .19 * (Math.cos(angle) - 1);
        offset.z = -.19 * Math.sin(angle) - .16 * (1 - t);
      }
      if (exploded) {
        if (p === left || p === right) offset.x += p === left ? -.15 : .15;
        if (p === top) offset.y += .14;
        if (p === plinth || rails.includes(p)) offset.z += .13;
        if (p === bottom) offset.y -= .08;
        if (p === rearRail || back.includes(p)) offset.z -= .12;
      }
      show(p, active && index > 0, offset, rotation);
    });
    fittings.forEach(p => {
      const futureParent = p.group.parent;
      if (!(all || index >= p.start) || isDrawer(index) || !futureParent.visible) return;
      const active = index === p.start && !p.prefitted;
      const off = active ? (p.entry?.clone() || V(0, 1, 0).applyEuler(p.rotation)).multiplyScalar(.045 * (1 - t)) : V();
      show(p, active, off);
    });
    nails.forEach(p => {
      if (all || (index >= p.start && !isDrawer(index))) show(p, index === p.start, V(0, 0, index === p.start ? -.05 * (1 - t) : 0));
    });
    if (index >= 23 && !isDrawer(index)) {
      show(wall); marks.forEach(p => show(p, index === 23));
    }
    if (isDrawer(index)) {
      const d = drawerSets[0]; d.group.visible = true;
      d.group.position.set(0, index >= 35 ? .122 : .245, 0);
      d.group.rotation.set(index >= 35 ? Math.PI : Math.PI / 2, 0, 0);
      d.panels.forEach(p => {
        if (index < p.start) return;
        const active = index === p.start;
        const off = V();
        if (active && (p === d.base || d.sides.includes(p) || p === d.rear)) off.z -= .22 * (1 - t);
        if (active && p === d.brace) off.y -= .1 * (1 - t);
        if (exploded) {
          if (d.sides.includes(p)) off.x += p === d.sides[0] ? -.08 : .08;
          if (p === d.base || p === d.brace) off.y -= p === d.base ? .07 : .12;
          if (p === d.rear) off.z -= .1;
        }
        show(p, active, off);
      });
      d.hardware.forEach(p => { if (index >= p.start && p.group.parent.visible) show(p, index === p.start, index === p.start ? (p.entry?.clone() || V(0, 1, 0).applyEuler(p.rotation)).multiplyScalar(.03 * (1 - t)) : V()); });
    } else if (all) {
      drawerSets.forEach((d, i) => {
        const order = 2 - i;
        const q = index === 37 ? Math.min(1, Math.max(0, t * 3 - order)) : 1;
        d.group.visible = index !== 37 || t * 3 >= order;
        d.group.position.set(0, .39 + [.236, .008, -.22][i], .44 * (1 - q) + (exploded ? .18 + (2 - i) * .11 : 0));
        d.group.rotation.set(-.12 * (1 - q), 0, 0);
        [...d.panels, ...d.hardware].forEach(p => show(p, index === 37 && q < 1));
      });
    }
  }
  function camera(index) {
    if (index <= 4 && index > 0) return { key: 'preparation', position: V(1.2, 1.55, 1.7), target: V(0, .08, 0), front: V(0, 2.2, .001) };
    if (index >= 5 && index <= 14) return { key: 'side-down', position: V(1.3, 1.5, 1.75), target: V(0, .4, 0), front: V(0, 1.8, 1.6) };
    if (index === 15 || index === 16) return { key: 'top-underside', position: V(1.0, 1.4, 1.5), target: V(0, .03, 0), front: V(0, 2, .001) };
    if (index >= 19 && index <= 22) return { key: 'rear-up', position: V(1.15, 1.65, 1.45), target: V(0, .25, 0), front: V(0, 2.1, .001) };
    if (isDrawer(index)) return { key: index >= 35 ? 'drawer-bottom-up' : 'drawer-front-down', position: V(1.05, 1.3, 1.5), target: V(0, .18, 0), front: V(0, 1.85, .001) };
    return { key: 'upright', position: V(1.3, 1.22, 1.8), target: V(0, .4, 0), front: V(0, .45, 2.25), back: V(-1.3, 1.22, -1.8) };
  }
  function focus(index) {
    const d = drawerSets[0];
    if (isDrawer(index)) {
      const p = index === 29 ? d.hardware.find(p => p.start === 29) : index === 30 ? d.sides[0] : index === 32 ? d.base : index === 33 ? d.rear : index === 36 ? d.brace : d.hardware.find(p => p.start === index);
      return { piece: p || d.front, distance: index === 36 ? .68 : .38, direction: V(-.5, 1, .7) };
    }
    if (index >= 19 && index <= 22) return { piece: nails.find(p => p.start === index) || back[0], direction: V(-.3, 1, .35), distance: .28 };
    if (index >= 23 && index <= 28) return { piece: restraints[1], direction: V(0, -.1, 1), distance: .33 };
    const p = fittings.find(p => p.start === index && p.group.visible && p.group.parent.visible);
    return { piece: p || (index === 12 ? right : index === 17 ? top : index === 5 ? plinthBrackets[0] : index >= 37 ? drawerSets[0].front : left), distance: index >= 37 ? .85 : .35 };
  }
  return { update, camera, focus };
}
