import * as T from './vendor/three.module.mjs';

// Scene units are millimetres. Wood geometry is a photographic reconstruction,
// not manufacturing CAD. BubbleBox case meshes are sampled cross-sections of upstream CAD.
export const materials = {
  wood: new T.MeshStandardMaterial({color:0xcbaa79,roughness:.88}),
  edge: new T.MeshStandardMaterial({color:0xb28b57,roughness:.9}),
  grain: new T.MeshStandardMaterial({color:0xba9969,roughness:1}),
  shell: new T.MeshStandardMaterial({color:0x80aaa7,roughness:.76,side:T.DoubleSide}),
  base: new T.MeshStandardMaterial({color:0x526a68,roughness:.85,side:T.DoubleSide}),
  clear: new T.MeshStandardMaterial({color:0xd7dcdd,transparent:true,opacity:.48,roughness:.28,depthWrite:false}),
  black: new T.MeshStandardMaterial({color:0x252d32,roughness:.65}),
  pink: new T.MeshStandardMaterial({color:0xd782a5,roughness:.65}),
  white: new T.MeshStandardMaterial({color:0xe6e6dd,roughness:.7}),
  gray: new T.MeshStandardMaterial({color:0xc5c9c3,roughness:.7}),
  pcb: new T.MeshStandardMaterial({color:0x28684a,roughness:.65}),
  gold: new T.MeshStandardMaterial({color:0xc4a75c,metalness:.55,roughness:.42}),
  silver: new T.MeshStandardMaterial({color:0x9aa4a7,metalness:.65,roughness:.36}),
};
const boxGeo = new T.BoxGeometry(1,1,1);
function mesh(g,m,parent,x=0,y=0,z=0) {const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;}
function box(w,h,d,x,y,z,m,parent) {const o=mesh(boxGeo,m,parent,x,y,z);o.scale.set(w,h,d);return o;}
function cylinder(r,h,x,y,z,m,parent,n=12) {return mesh(new T.CylinderGeometry(r,r,h,n),m,parent,x,y,z);}
function part(model,id,name,offset) {const g=new T.Group();g.name=name;g.userData={id,explode:offset};model.root.add(g);model.parts.push(g);return g;}
function squarePath(x,z,size) {const s=size/2;return new T.Path([new T.Vector2(x-s,-z-s),new T.Vector2(x+s,-z-s),new T.Vector2(x+s,-z+s),new T.Vector2(x-s,-z+s)]);}
function plate(w,d,h,y,holes,m,parent) {
  const s=new T.Shape([new T.Vector2(-w/2,-d/2),new T.Vector2(w/2,-d/2),new T.Vector2(w/2,d/2),new T.Vector2(-w/2,d/2)]);
  holes.forEach(k=>s.holes.push(squarePath(k.x,k.z,14.2)));
  const g=new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:4,steps:1});g.rotateX(-Math.PI/2);
  return mesh(g,m,parent,0,y,0);
}
function wire(points,color,parent,r=.45) {
  const c=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
  return mesh(new T.TubeGeometry(c,12,r,4,false),new T.MeshStandardMaterial({color,roughness:.9}),parent);
}
function screw(x,y,z,parent) {cylinder(2,9,x,y-4,z,materials.silver,parent);cylinder(4,1.7,x,y+.3,z,materials.silver,parent);box(5,.15,.7,x,y+1.2,z,materials.black,parent);box(.7,.15,5,x,y+1.2,z,materials.black,parent);}
function pico(parent,x,y,z,flipped=false) {
  const g=new T.Group();g.name='Raspberry Pi Pico (simplified)';g.position.set(x,y,z);if(flipped)g.rotation.x=Math.PI;parent.add(g);
  box(21,1.6,51,0,0,0,materials.pcb,g);box(7,1.1,7,0,1.4,1,materials.black,g);
  box(7.7,3.1,6,0,2,-23,materials.silver,g);box(6,1.9,1,0,2,-26.2,materials.black,g);
  box(4,1.8,3,-3,1.7,-13,materials.white,g);
  for(let i=0;i<20;i++)for(const x0 of [-9.6,9.6])cylinder(.75,.25,x0,1,i*2.4-23,materials.gold,g,6);
  for(let i=0;i<9;i++)box(1.4,.8,2.4,(i%2?5:-5),1.1,-15+i*4,materials.silver,g);
  return g;
}
function breakout(parent,x,y,z,wood) {
  const g=new T.Group();g.name=wood?'Treedix USB-C breakout (simplified)':'Bird-D USB-C breakout (simplified)';g.position.set(x,y,z);parent.add(g);
  const w=wood?25.4:30,d=wood?41.3:15;
  box(w,1.6,d,0,0,0,materials.black,g);box(9,3.3,7,0,2,-d/2,materials.silver,g);box(7,1.8,.4,0,2,-d/2-3.6,materials.black,g);
  for(let i=0;i<(wood?12:6);i++)for(const side of [-1,1])cylinder(.7,.3,side*(w/2-2),1,i*2.54-(wood?14:6),materials.gold,g,6);
  return g;
}
function keySwitch(k,y,parent) {
  const g=new T.Group();g.position.set(k.x,y,k.z);parent.add(g);
  box(14,4,14,0,-2,0,materials.clear,g);box(15.5,1.2,15.5,0,.4,0,materials.gray,g);
  const stem=k.whiteStem?materials.white:materials.pink;
  box(4,4,1.2,0,3,0,stem,g);box(1.2,4,4,0,3,0,stem,g);
  for(const x of [-3,3])cylinder(.35,3,x,-5,2,materials.gold,g,6);
}
function woodCap(k,y,parent) {
  const g=new T.Group();g.position.set(k.x,y,k.z);g.name=k.legend?`Keycap ${k.legend}`:'Clear keycap';parent.add(g);
  const m=k.black?materials.black:materials.clear;
  // Hollow square caps: thin top plus four sloping skirt panels, rather than solid cubes.
  box(15,1,15,0,5,0,m,g);
  for(const side of [-1,1]) {const a=box(1,5.5,17,side*8,2,0,m,g);a.rotation.z=side*.13;const b=box(15,5.5,1,0,2,side*8,m,g);b.rotation.x=-side*.13;}
  if(!k.black) {box(4,2,1.2,0,1,0,k.whiteStem?materials.white:materials.pink,g);box(1.2,2,4,0,1,0,k.whiteStem?materials.white:materials.pink,g);}
  // Small pale legend strokes on the four mismatched black caps visible in the photograph.
  if(k.legend) {
    const seg=(x,z,w,d)=>box(w,.12,d,x,5.56,z,materials.gray,g);
    if(k.legend==='H'){seg(-2,0,.7,6);seg(2,0,.7,6);seg(0,0,4,.7);}
    if(k.legend==='E'){seg(-2,0,.7,6);[-3,0,3].forEach(z=>seg(0,z,4,.7));}
    if(k.legend==='K'){seg(-2,0,.7,6);for(const s of [-1,1]){const a=seg(.2,s*1.5,.7,4.2);a.rotation.y=s*.7;}}
    if(k.legend==='G'){seg(-2,0,.7,6);[-3,3].forEach(z=>seg(0,z,4,.7));seg(2,1.5,.7,3);seg(1,0,2,.7);}
  }
}
function wiring(keys,y,picoX,picoZ,parent,wood) {
  keys.forEach((k,i)=>{
    const targetX=picoX+(k.x<picoX?-10:10),targetZ=picoZ-22+(i%20)*2.2;
    wire([[k.x+3,y,k.z+2],[k.x*.7+picoX*.3,y-3-(i%3),k.z*.65+picoZ*.35],[targetX+(k.x<picoX?-8:8),y-3,targetZ],[targetX,y-2,targetZ]],wood?(k.x<0?0xb45936:0x524b80):0x303c3a,parent);
    if(i) {const prev=keys[i-1];wire([[prev.x-3,y,prev.z+2],[(k.x+prev.x)/2,y-2,(k.z+prev.z)/2+7],[k.x-3,y,k.z+2]],0x343737,parent,.5);}
  });
}
function cadMesh(bands,parent,top) {
  const material=parent.name.includes('Bottom')?materials.base:materials.shell;
  for(const band of bands)for(const outline of band.shapes){
    const shape=new T.Shape(outline.outer.map(([x,y])=>new T.Vector2(x,y)));
    for(const hole of outline.holes)shape.holes.push(new T.Path(hole.map(([x,y])=>new T.Vector2(x,y))));
    const geometry=new T.ExtrudeGeometry(shape,{depth:band.high-band.low,bevelEnabled:false,steps:1});geometry.rotateX(-Math.PI/2);
    mesh(geometry,material,parent,0,top-band.high,0);
  }
}

export function buildModel(kind,data) {
  const model={kind,root:new T.Group(),parts:[],keys:[],width:kind==='wood'?360.68:305};
  model.root.name=kind==='wood'?'Markus wooden controller — photo reconstruction':'BubbleBox — CAD-derived display model';
  if(kind==='wood') {
    model.keys=data.woodKeys;
    const bottom=part(model,'bottom','Bottom cover · inferred',-48);plate(360.68,165.10,3,0,[],materials.wood,bottom);
    const frame=part(model,'frame','Wooden frame & corner blocks',0);
    box(360.68,15,8,0,10.5,78.55,materials.edge,frame);
    // Rear wall leaves an opening for the USB-C connector.
    box(213.84,15,8,-73.42,10.5,-78.55,materials.edge,frame);
    box(135.84,15,8,112.42,10.5,-78.55,materials.edge,frame);
    box(11,5,8,39,5.5,-78.55,materials.edge,frame);
    box(11,3,8,39,16.5,-78.55,materials.edge,frame);
    for(const x of [-176.34,176.34])box(8,15,149.1,x,10.5,0,materials.edge,frame);
    for(const x of [-162,162])for(const z of [-64,64])box(24,13,24,x,9.5,z,materials.wood,frame);
    const top=part(model,'top','Plywood switch panel',68);plate(360.68,165.1,3,18,model.keys,materials.wood,top);
    // Low-contrast grain strokes are geometry, so they also appear in downloadable models.
    for(let i=0;i<33;i++) {
      const z=-79+i*4.9;let start=-179.34;
      const cuts=model.keys.filter(k=>Math.abs(k.z-z)<7.5).map(k=>[k.x-8,k.x+8]).sort((a,b)=>a[0]-b[0]);
      for(const [a,b] of [...cuts,[179.34,179.34]]) {if(a>start)box(a-start,.025,.12+(i%3)*.07,(a+start)/2,21.03,z,materials.grain,top);start=Math.max(start,b);}
    }
    const electronics=part(model,'electronics','Pico, USB-C & hand wiring',32);
    pico(electronics,-15,8,21,true);breakout(electronics,39,9,-54.5,true);
    wiring(model.keys,14,-15,21,electronics,true);
    wire([[39,10,-53],[19,11,-25],[-13,9,-5]],0x2b2d2e,electronics,1.3);
    const switches=part(model,'switches','22 mechanical switches',104),caps=part(model,'caps','22 keycaps · 18 clear, 4 black',142);
    model.keys.forEach(k=>{keySwitch(k,21,switches);woodCap(k,25,caps);});
    const hardware=part(model,'hardware','Corner screws · underside',-26);
    for(const x of [-162,162])for(const z of [-64,64]){const s=new T.Group();s.rotation.x=Math.PI;s.position.set(x,2,z);hardware.add(s);screw(0,0,0,s);}
  } else {
    model.keys=data.bubbleCenters.map(([x,z])=>({x,z}));
    const bottom=part(model,'bottom','Bottom panel · upstream CAD',-42);cadMesh(data.bottom,bottom,2);
    const shell=part(model,'top','Printed shell & switch seats · upstream CAD',45);cadMesh(data.body,shell,14);
    const electronics=part(model,'electronics','Pico, Bird-D & wiring · schematic',18);
    pico(electronics,0,6,35,true);breakout(electronics,0,6,-59,false);wiring(model.keys,5,0,35,electronics,false);
    wire([[0,7,-59],[20,5,-25],[0,6,12]],0x343737,electronics,1.2);
    const sockets=part(model,'sockets','22 hot-swap sockets · schematic',30);
    const switches=part(model,'switches','22 MX switches · schematic',83),caps=part(model,'caps','22 round keycaps · schematic',116);
    model.keys.forEach(k=>{
      box(11,1.5,4,k.x,4.6,k.z+3,materials.black,sockets);
      for(const x of [-4,4])box(2,.5,3,k.x+x,3.7,k.z+3,materials.gold,sockets);
      keySwitch(k,14,switches);cylinder(9.9,3,k.x,21,k.z,materials.gray,caps,24);
    });
    const hardware=part(model,'hardware','Case screws · schematic',-22);
    [[-130,-58],[-20,-58],[24,-58],[130,-58],[-130,58],[-50,58],[50,58],[130,58],[0,5]].forEach(([x,z])=>{const s=new T.Group();s.position.set(x,0,z);s.rotation.x=Math.PI;hardware.add(s);screw(0,0,0,s);});
  }
  model.root.updateMatrixWorld(true);return model;
}
export function setExplosion(model,amount,{inside=false,selected=null}={}) {
  model.parts.forEach(p=>{p.position.y=p.userData.explode*amount;p.visible=!(inside&&(p.userData.id==='bottom'||p.userData.id==='hardware'));});
  model.root.updateMatrixWorld(true);
}

// Real geometry projected into Canvas2D when WebGL is unavailable. Also used for
// deterministic posters/QA. No remote assets or static-image substitution required.
export function paintModel(ctx,model,camera,width,height) {
  camera.updateMatrixWorld();model.root.updateMatrixWorld(true);
  const vp=new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),triangles=[];
  const light=new T.Vector3(-.35,.85,.45).normalize();
  model.root.traverseVisible(o=>{
    if(!o.isMesh)return;const g=o.geometry,positions=g.attributes.position,index=g.index?.array;
    const projected=[],world=[];const m=o.material;
    for(let i=0;i<positions.count;i++){const v=new T.Vector3().fromBufferAttribute(positions,i).applyMatrix4(o.matrixWorld);world.push(v);const p=v.clone().applyMatrix4(vp);projected.push([(p.x+1)*width/2,(1-p.y)*height/2,p.z]);}
    const n=index?index.length:positions.count;
    for(let i=0;i<n;i+=3){const ids=index?[index[i],index[i+1],index[i+2]]:[i,i+1,i+2],a=projected[ids[0]],b=projected[ids[1]],c=projected[ids[2]];
      if(a[2]>1||b[2]>1||c[2]>1)continue;
      const normal=new T.Vector3().subVectors(world[ids[1]],world[ids[0]]).cross(new T.Vector3().subVectors(world[ids[2]],world[ids[0]])).normalize();
      const front=normal.dot(new T.Vector3().subVectors(camera.position,world[ids[0]]))>0;
      if(!front&&m.side!==T.DoubleSide)continue;
      const intensity=.64+.36*Math.max(0,normal.dot(light));const col=m.color.clone().multiplyScalar(intensity).convertLinearToSRGB();
      triangles.push({a,b,c,depth:(a[2]+b[2]+c[2])/3,color:[Math.round(col.r*255),Math.round(col.g*255),Math.round(col.b*255)],alpha:m.transparent?m.opacity:1});
    }
  });
  const pixels=ctx.createImageData(width,height),rgba=pixels.data,depths=new Float32Array(width*height).fill(Infinity);
  // Per-pixel depth avoids painter-order artefacts on large CAD faces.
  triangles.sort((a,b)=>(a.alpha<1)-(b.alpha<1)||b.depth-a.depth);
  for(const t of triangles){const [a,b,c]=[t.a,t.b,t.c];
    const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<.0001)continue;
    const xmin=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),xmax=Math.min(width-1,Math.ceil(Math.max(a[0],b[0],c[0])));
    const ymin=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),ymax=Math.min(height-1,Math.ceil(Math.max(a[1],b[1],c[1])));
    for(let y=ymin;y<=ymax;y++)for(let x=xmin;x<=xmax;x++){
      const u=((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/den;
      const v=((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/den,w=1-u-v;
      if(u<0||v<0||w<0)continue;const depth=u*a[2]+v*b[2]+w*c[2],i=y*width+x;
      if(depth>depths[i]+1e-7)continue;const j=i*4,alpha=t.alpha,old=rgba[j+3]/255,total=alpha+old*(1-alpha);
      for(let k=0;k<3;k++)rgba[j+k]=(t.color[k]*alpha+rgba[j+k]*old*(1-alpha))/total;
      rgba[j+3]=total*255;if(alpha===1)depths[i]=depth;
    }
  }
  ctx.putImageData(pixels,0,0);
}

export function positionCamera(camera,model,width,height,theta=.22,phi=.78,zoom=1,explosion=0) {
  // Fit both the wide assembled shell and the taller exploded assembly on phones.
  const targetY=20+explosion*42;
  const horizontal=model.width/(2*Math.tan(camera.fov*Math.PI/360)*(width/height));
  const distance=Math.max(horizontal*1.2,model.width*1.05)*(1+explosion*.13)/zoom;
  camera.aspect=width/height;camera.updateProjectionMatrix();
  camera.position.set(distance*Math.sin(phi)*Math.sin(theta),targetY+distance*Math.cos(phi),distance*Math.sin(phi)*Math.cos(theta));camera.lookAt(0,targetY,0);camera.updateMatrixWorld();
}
