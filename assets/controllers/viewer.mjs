import * as T from './vendor/three.module.mjs';
import {buildModel,setExplosion,paintModel,positionCamera} from './models.mjs';
const host=document.querySelector('#model-stage'),status=document.querySelector('#model-status');
let renderer,ctx,canvas,model,kind='wood',amount=0,inside=false,theta=.2,phi=.78,zoom=1,queued=false;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1,1,4000);
scene.add(new T.HemisphereLight(0xffffff,0x6d705f,2.1));const light=new T.DirectionalLight(0xfff7e8,2.5);light.position.set(-220,500,300);scene.add(light);
const descriptions={wood:'Photographic reconstruction · 360.68 × 165.10 × 21 mm enclosure',bubble:'BubbleBox V4 · CAD-derived shell · 305 × 140 mm footprint'};
try {
 const response=await fetch(new URL('./geometry.json',import.meta.url));if(!response.ok)throw new Error('Geometry unavailable');const data=await response.json();
 canvas=document.createElement('canvas');
 try {renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);}
 catch {canvas=document.createElement('canvas');ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');}
 canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Interactive controller model. Arrow keys rotate; plus and minus zoom; Home resets.');canvas.setAttribute('aria-describedby','viewer-help');
 host.append(canvas);host.classList.add('ready');document.querySelector('#viewer-controls').hidden=false;
 function draw(){queued=false;const w=host.clientWidth,h=host.clientHeight;positionCamera(camera,model,w,h,theta,phi,zoom,amount);if(renderer){renderer.setSize(w,h,false);renderer.render(scene,camera);}else{const scale=Math.min(1,800/w);canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);paintModel(ctx,model,camera,canvas.width,canvas.height);}}
 function render(){if(!queued){queued=true;requestAnimationFrame(draw);}}
 function sync(){setExplosion(model,amount,{inside});document.querySelector('#explosion').value=Math.round(amount*100);document.querySelector('#explosion-value').textContent=`${Math.round(amount*100)}%`;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===(inside?'inside':amount===0?'assembled':amount===1?'exploded':''))));render();}
 function choose(next){if(model)scene.remove(model.root);kind=next;model=models[kind];scene.add(model.root);amount=kind==='bubble'?1:0;inside=false;theta=.2;phi=kind==='bubble'?.91:.78;zoom=1;status.textContent=descriptions[kind];document.querySelectorAll('[data-model]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.model===kind)));document.querySelector('#download-model').href=`../assets/controllers/${kind}.glb`;const list=document.querySelector('#parts-list');list.replaceChildren();for(const p of [...model.parts].sort((a,b)=>b.userData.explode-a.userData.explode)){const li=document.createElement('li');li.textContent=p.name;list.append(li);}sync();}
 const models={wood:buildModel('wood',data),bubble:buildModel('bubble',data)};choose('wood');
 document.querySelectorAll('[data-model]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.model)));
 document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{inside=b.dataset.view==='inside';amount=b.dataset.view==='exploded'?1:0;phi=inside?2.25:amount?.91:.78;zoom=1;sync();}));
 document.querySelector('#explosion').addEventListener('input',e=>{amount=Number(e.target.value)/100;if(inside){inside=false;phi=.91;}sync();});
 function zoomBy(n){zoom=Math.max(.65,Math.min(2.4,zoom*n));render();}
 document.querySelector('#zoom-in').addEventListener('click',()=>zoomBy(1.15));document.querySelector('#zoom-out').addEventListener('click',()=>zoomBy(1/1.15));
 function reset(){theta=.2;phi=inside?2.25:amount?.91:.78;zoom=1;render();}
 document.querySelector('#reset-view').addEventListener('click',reset);
 const pointers=new Map();let distance=0;
 canvas.addEventListener('pointerdown',e=>{canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);distance=0;});
 canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const previous=pointers.get(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(distance)zoomBy(d/distance);distance=d;}else{theta-=(e.clientX-previous[0])*.008;phi=Math.max(.08,Math.min(Math.PI-.08,phi+(e.clientY-previous[1])*.008));render();}});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{pointers.delete(e.pointerId);distance=0;});
 canvas.addEventListener('wheel',e=>{if(document.activeElement!==canvas)return;e.preventDefault();zoomBy(Math.exp(-e.deltaY*.001));},{passive:false});
 canvas.addEventListener('keydown',e=>{const actions={ArrowLeft:()=>theta-=.12,ArrowRight:()=>theta+=.12,ArrowUp:()=>phi=Math.max(.08,phi-.12),ArrowDown:()=>phi=Math.min(Math.PI-.08,phi+.12),'+':()=>zoomBy(1.15),'=':()=>zoomBy(1.15),'-':()=>zoomBy(1/1.15),Home:reset};if(actions[e.key]){e.preventDefault();actions[e.key]();render();}});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();status.textContent='3D graphics were interrupted. Reload to restart, or use the model downloads below.';host.classList.remove('ready');canvas.hidden=true;document.querySelector('#viewer-controls').hidden=true;});
 new ResizeObserver(render).observe(host);
} catch(error){status.textContent='The interactive model could not load. The previews and downloadable 3D files are available below.';console.error(error);}
