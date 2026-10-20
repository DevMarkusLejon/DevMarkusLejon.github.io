import {createRequire} from 'node:module';
const {createCanvas}=createRequire(import.meta.url)('@napi-rs/canvas');
import fs from 'node:fs';
import * as T from '../assets/controllers/vendor/three.module.mjs';
import {buildModel,setExplosion,paintModel,positionCamera} from '../assets/controllers/models.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../assets/controllers/geometry.json',import.meta.url)));
for(const kind of ['wood','bubble'])for(const [view,amount,phi] of [['assembled',0,.72],['exploded',1,.91],['inside',0,2.25]]) {
 const model=buildModel(kind,data);setExplosion(model,amount,{inside:view==='inside'});
 const camera=new T.PerspectiveCamera(36,1,1,4000),canvas=createCanvas(1200,850);
 positionCamera(camera,model,1200,850,.2,phi,1,amount);
 paintModel(canvas.getContext('2d'),model,camera,1200,850);
 fs.writeFileSync(new URL(`../assets/controllers/${kind}-${view}.webp`,import.meta.url),canvas.toBuffer('image/webp',85));
 console.log(kind,view,model.keys.length,new T.Box3().setFromObject(model.root).getSize(new T.Vector3()).toArray());
}
