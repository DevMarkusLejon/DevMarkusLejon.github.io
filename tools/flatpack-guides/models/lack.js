export function createModel({ THREE, root, V, box, fastener, show }) {
  const top = box('Tabletop · four holes underneath', [0.55, 0.05, 0.55], V(0, 0.425, 0));
  const legs = [], screws = [];
  for (const x of [-0.25, 0.25]) for (const z of [-0.25, 0.25]) {
    legs.push(box('Square leg · turn around the screw', [0.05, 0.4, 0.05], V(x, 0.2, z)));
    screws.push(fastener('115980 · double-ended screw', V(x, 0.4, z), V(0, 1, 0), 'double', 0.045));
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.0035, 16), new THREE.MeshBasicMaterial({ color: 0x62685b }));
    hole.rotation.x = Math.PI / 2; hole.position.set(x, -0.0251, z); top.group.add(hole);
  }
  return {
    update({ index, t, exploded }) {
      const upside = index === 1 || index === 2;
      if (upside) { root.rotation.x = Math.PI; root.position.y = 0.45; }
      show(top, false, V(0, exploded && !upside ? 0.1 : 0, 0));
      screws.forEach((s, i) => {
        show(s, index === 1, V(0, index === 1 ? -(1 - t) * 0.065 : 0, 0));
        if (index === 1) s.group.rotateY((1 - t) * Math.PI * 4);
        if (index !== 1) {
          const local = index === 2 ? Math.max(0, Math.min(1, t * 4 - i)) : 1;
          show(legs[i], index === 2, V(0, -(1 - local) * 0.2 - (exploded ? 0.13 : 0), 0));
          if (index === 2) legs[i].group.rotation.y = (1 - local) * Math.PI * 4;
        }
      });
    },
    camera(index) {
      return { key: index === 1 || index === 2 ? 'underside' : 'upright', target: V(0, 0.23, 0), position: V(0.95, 0.94, 1.25), front: V(0, 0.5, 1.55), back: V(-0.95, 0.94, -1.25) };
    },
    focus() { return { piece: screws[1], direction: V(-1, 1.5, 1), distance: 0.3 }; },
  };
}
