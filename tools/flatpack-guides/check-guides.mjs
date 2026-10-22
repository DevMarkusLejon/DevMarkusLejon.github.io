import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import * as THREE from 'three';

const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
for (const [slug, count] of [['lack',4],['poang',15],['malm',39]]) {
  const { guide } = await import(`./data/${slug}.js`);
  const { createModel } = await import(`./models/${slug}.js`);
  assert.equal(guide.steps.length,count,`${slug}: sequence length`);
  for (const step of guide.steps) {
    assert(step.title && step.description && step.tip && step.orientation);
    for (const source of step.sources || [step]) {
      const manual=guide.manuals[source.manual ?? step.manual ?? 0];
      assert(existsSync(new URL(`./public/manual/${slug}/${manual.prefix || 'page-'}${source.page}.png`, import.meta.url)), `${slug}: missing source page`);
      assert(existsSync(new URL(`./public/manual/${slug}/${manual.file}`, import.meta.url)), `${slug}: missing PDF`);
    }
  }
  const root = new THREE.Group(), pieces=[];
  function part(name,geometry,position=V(),color=0xffffff,options={}) {
    const group=new THREE.Group(), material=new THREE.MeshStandardMaterial({color,...options});
    const body=new THREE.Mesh(geometry,material); group.add(body); root.add(group);
    const p={name,group,body,material,color,position,rotation:new THREE.Euler()};pieces.push(p);return p;
  }
  const box=(name,size,position,color,options)=>part(name,new THREE.BoxGeometry(...size),position,color,options);
  function fastener(name,position,axis,kind,length=.03) {
    const p=part(name,new THREE.CylinderGeometry(.003,.003,length),position);
    p.rotation.setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0,1,0),axis));return p;
  }
  function show(p,active,offset=V(),rotation) {
    p.group.visible=true;p.group.position.copy(p.position).add(offset);p.group.rotation.copy(rotation||p.rotation);
  }
  const model=createModel({THREE,root,V,part,box,fastener,show,pieces});
  const visible=p=>{for(let g=p.group;g;g=g.parent)if(!g.visible)return false;return true;};
  for(let index=0;index<count;index++) for(const t of [0,.5,1]) for(const exploded of [false,true]) {
    pieces.forEach(p=>p.group.visible=false);root.position.set(0,0,0);root.rotation.set(0,0,0);
    model.update({index,t,progress:t,exploded,xray:false});root.updateMatrixWorld(true);
    assert(pieces.some(visible),`${slug} ${index}: empty scene`);
    for(const p of pieces.filter(visible)) assert(p.group.matrixWorld.elements.every(Number.isFinite),`${slug} ${index}: invalid transform`);
    const c=model.camera(index);assert(c.position.toArray().every(Number.isFinite));
    if(index>0) { const f=model.focus(index);assert(f?.piece||f?.target,`${slug} ${index}: missing focus`); }
  }
  if(slug==='malm') {
    const expected=[['Cam lock',26],['cam bolt',26],['dowel · 101345',30],['Back nail',30],['centre brace',3]];
    const final=pieces.filter(visible);
    for(const [name,n] of expected) assert.equal(final.filter(p=>p.name.toLowerCase().includes(name.toLowerCase())).length,n,`MALM ${name}`);
    assert.deepEqual(guide.steps.slice(1,29).map(s=>s.label),Array.from({length:28},(_,i)=>String(i+1)));
    assert.deepEqual(guide.steps.slice(29,37).map(s=>s.label),Array.from({length:8},(_,i)=>`D${i+1}`));
    assert.equal(guide.steps[37].sources.length,2);
  }
  console.log(`${guide.name}: ${count} screens, source files and ${count*6} model states passed.`);
}
