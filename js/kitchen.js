/* 3D kitchen: two doner spits, cutting board with lavash, vegetable bowls and sauce bottles.
   Everything is built from code (placeholder art) so the models can later be swapped for Meshy GLBs.
   Talks to the game through window.Kitchen (show/hide/reset/wrap/state) and window.onKitchenChange(state). */
import * as THREE from 'three';
import {RoomEnvironment} from '../vendor/RoomEnvironment.js';

const MEATS={
  chicken:{name:'КУРИЦА',base:'#B9732E',dark:'#5A2E0E',light:'#E2A453'},
  beef:{name:'ГОВЯДИНА',base:'#7A3A20',dark:'#2E1408',light:'#A9603F'}
};
const SAUCES={garlic:{name:'ЧЕСНОК',c:'#F4ECD6'},spicy:{name:'ОСТРЫЙ',c:'#C8321E'},cheese:{name:'СЫРНЫЙ',c:'#F0B92E'}};
const MEAT_NEED=3,MEAT_MAX=8;

const root=document.getElementById('kitchen');
const hint=document.createElement('div');hint.className='khint';
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
root.appendChild(renderer.domElement);root.appendChild(hint);

const scene=new THREE.Scene();
scene.background=new THREE.Color('#2a1d15');
const pmrem=new THREE.PMREMGenerator(renderer);
scene.environment=pmrem.fromScene(new RoomEnvironment(),0.04).texture;
scene.environmentIntensity=0.55;

const camera=new THREE.PerspectiveCamera(38,1.6,0.1,100);
camera.position.set(0.4,6.4,10.6);
camera.lookAt(0.4,1.0,-0.9);

scene.add(new THREE.HemisphereLight('#fff1dc','#3a2618',0.6));
const key=new THREE.DirectionalLight('#fff4e2',2.2);
key.position.set(3,9,6);key.castShadow=true;
key.shadow.mapSize.set(1024,1024);
Object.assign(key.shadow.camera,{left:-8,right:8,top:6,bottom:-6,near:1,far:25});
key.shadow.bias=-0.0005;
scene.add(key);

/* ---------- procedural textures ---------- */
let seed=7;
function rnd(a=0,b=1){seed=(seed*16807)%2147483647;return a+(seed/2147483647)*(b-a);}
function canvasTex(w,h,draw,color=true){
  const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c);
  if(color)t.colorSpace=THREE.SRGBColorSpace;
  t.anisotropy=renderer.capabilities.getMaxAnisotropy();
  return t;
}
function shade(hex,k){
  const c=new THREE.Color(hex);c.offsetHSL(0,0,k);return '#'+c.getHexString();
}
function meatCanvas(m){
  return (g,w,h)=>{
    g.fillStyle=m.base;g.fillRect(0,0,w,h);
    for(let y=0;y<h;){                      /* stacked marinated slices */
      const bh=rnd(5,14);
      g.fillStyle=shade(m.base,rnd(-0.08,0.08));g.fillRect(0,y,w,bh);
      g.fillStyle='rgba(0,0,0,0.22)';g.fillRect(0,y+bh-1.5,w,1.5);
      y+=bh;
    }
    for(let i=0;i<900;i++){                 /* crispy char */
      g.fillStyle=`rgba(${m===MEATS.beef?'25,10,4':'80,40,10'},${rnd(0.25,0.7)})`;
      g.beginPath();g.ellipse(rnd(0,w),rnd(0,h),rnd(1,6),rnd(0.6,2.5),0,0,7);g.fill();
    }
    for(let i=0;i<260;i++){                 /* glistening fat */
      g.fillStyle=`rgba(255,${m===MEATS.beef?'200,170':'225,160'},${rnd(0.15,0.45)})`;
      g.beginPath();g.ellipse(rnd(0,w),rnd(0,h),rnd(2,9),rnd(0.6,1.6),0,0,7);g.fill();
    }
  };
}
const tex={
  tiles:canvasTex(256,256,(g,w,h)=>{
    g.fillStyle='#b9b2a6';g.fillRect(0,0,w,h);
    for(let r=0;r<4;r++)for(let c=0;c<2;c++){
      const off=(r%2)*64,x=c*128+off,y=r*64;
      for(const dx of [0,-256]){
        const gr=g.createLinearGradient(0,y,0,y+60);gr.addColorStop(0,'#f2ede4');gr.addColorStop(1,'#ddd5c8');
        g.fillStyle=gr;g.fillRect(x+dx+3,y+3,122,58);
      }
    }
  }),
  steel:canvasTex(512,64,(g,w,h)=>{
    g.fillStyle='#a9adb2';g.fillRect(0,0,w,h);
    for(let i=0;i<500;i++){g.fillStyle=`rgba(${rnd()<.5?'255,255,255':'40,40,40'},${rnd(0.02,0.08)})`;g.fillRect(0,rnd(0,h),w,rnd(0.4,1.2));}
  }),
  wood:canvasTex(512,256,(g,w,h)=>{
    g.fillStyle='#b07a45';g.fillRect(0,0,w,h);
    for(let i=0;i<140;i++){g.strokeStyle=`rgba(${rnd()<.5?'90,50,20':'215,170,110'},${rnd(0.1,0.35)})`;g.lineWidth=rnd(0.5,3);
      g.beginPath();const y=rnd(0,h);g.moveTo(0,y);g.bezierCurveTo(w*.3,y+rnd(-8,8),w*.7,y+rnd(-8,8),w,y+rnd(-5,5));g.stroke();}
    for(let i=0;i<30;i++){g.strokeStyle='rgba(60,30,10,0.25)';g.lineWidth=1;g.beginPath();g.moveTo(rnd(0,w),rnd(0,h));g.lineTo(rnd(0,w),rnd(0,h));g.stroke();}
  }),
  lavash:canvasTex(512,512,(g,w,h)=>{
    g.fillStyle='#EED7A6';g.fillRect(0,0,w,h);
    for(let i=0;i<70;i++){                  /* toasted blisters */
      const x=rnd(0,w),y=rnd(0,h),r=rnd(6,26),gr=g.createRadialGradient(x,y,0,x,y,r);
      gr.addColorStop(0,`rgba(150,90,35,${rnd(0.35,0.7)})`);gr.addColorStop(1,'rgba(150,90,35,0)');
      g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,7);g.fill();
    }
    for(let i=0;i<1600;i++){g.fillStyle=`rgba(255,250,235,${rnd(0.1,0.4)})`;g.fillRect(rnd(0,w),rnd(0,h),1.5,1.5);}
  }),
  heater:canvasTex(128,256,(g,w,h)=>{
    g.fillStyle='#1a0d06';g.fillRect(0,0,w,h);
    for(let r=0;r<8;r++)for(let c=0;c<4;c++){
      const x=c*32+16,y=r*32+16,gr=g.createRadialGradient(x,y,0,x,y,15);
      gr.addColorStop(0,'#fff0a0');gr.addColorStop(0.4,'#ff8a2a');gr.addColorStop(1,'#5a1a05');
      g.fillStyle=gr;g.fillRect(x-14,y-14,28,28);
    }
  }),
  smoke:canvasTex(64,64,(g,w,h)=>{
    const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,0.8)');gr.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=gr;g.fillRect(0,0,w,h);
  })
};
tex.tiles.wrapS=tex.tiles.wrapT=THREE.RepeatWrapping;tex.tiles.repeat.set(9,3);
function labelTex(text,bg,fg){
  return canvasTex(256,64,(g,w,h)=>{
    g.fillStyle=bg;g.fillRect(0,0,w,h);
    g.fillStyle=fg;g.font='700 34px Onest,Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,w/2,h/2+2);
  });
}

/* ---------- materials ---------- */
const M={
  steel:new THREE.MeshStandardMaterial({color:'#c9cdd2',map:tex.steel,metalness:0.85,roughness:0.32}),
  darkSteel:new THREE.MeshStandardMaterial({color:'#3b3d40',metalness:0.7,roughness:0.45}),
  wall:new THREE.MeshStandardMaterial({map:tex.tiles,roughness:0.35}),
  wood:new THREE.MeshStandardMaterial({map:tex.wood,roughness:0.7}),
  lavash:new THREE.MeshStandardMaterial({map:tex.lavash,roughness:0.9,side:THREE.DoubleSide}),
  ceramic:new THREE.MeshPhysicalMaterial({color:'#f4efe6',roughness:0.2,clearcoat:0.6,side:THREE.DoubleSide}),
  tomato:new THREE.MeshPhysicalMaterial({color:'#d4321f',roughness:0.3,clearcoat:0.7}),
  cucSide:new THREE.MeshStandardMaterial({color:'#2d5e22',roughness:0.45}),
  cucFace:new THREE.MeshPhysicalMaterial({color:'#cfe39b',roughness:0.35,clearcoat:0.5}),
  onion:new THREE.MeshPhysicalMaterial({color:'#dcc6e8',roughness:0.3,clearcoat:0.6,transmission:0.15}),
  handle:new THREE.MeshStandardMaterial({color:'#1d1d1d',roughness:0.5})
};
const meatMat={};
for(const k in MEATS){
  const map=canvasTex(512,512,meatCanvas(MEATS[k]));
  const bump=new THREE.CanvasTexture(map.image);
  map.wrapS=bump.wrapS=THREE.RepeatWrapping;map.repeat.set(2,1);bump.repeat.set(2,1);
  meatMat[k]=new THREE.MeshPhysicalMaterial({map,bumpMap:bump,bumpScale:2.2,roughness:0.5,clearcoat:0.35,clearcoatRoughness:0.4});
  meatMat[k+'Strip']=meatMat[k].clone();meatMat[k+'Strip'].side=THREE.DoubleSide;
}
function mesh(geo,mat,shadow=true){const m=new THREE.Mesh(geo,mat);m.castShadow=shadow;m.receiveShadow=true;return m;}

/* ---------- room ---------- */
const wall=mesh(new THREE.PlaneGeometry(26,10),M.wall,false);wall.position.set(0,3,-3.4);scene.add(wall);
const top=mesh(new THREE.BoxGeometry(14,0.25,5.2),M.steel,false);top.position.set(0,-0.125,-0.6);scene.add(top);
const front=mesh(new THREE.BoxGeometry(14,3,0.2),M.wood,false);front.position.set(0,-1.6,2);scene.add(front);

/* ---------- spits ---------- */
const targets=[];
function meatGeometry(){
  /* doner profile: narrow at the bottom, widening upward, with an uneven pressed-meat surface */
  const pts=[new THREE.Vector2(0.04,0.3)];
  for(let i=0;i<=48;i++){
    const t=i/48;
    pts.push(new THREE.Vector2(0.52+0.32*Math.pow(t,1.3)+0.012*Math.sin(t*23)+0.008*Math.sin(t*61),0.36+t*3.1));
  }
  pts.push(new THREE.Vector2(0.6,3.5),new THREE.Vector2(0.06,3.6));
  const g=new THREE.LatheGeometry(pts,64),p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x),r=Math.hypot(x,z);
    if(r<0.2)continue;
    const n=1+0.035*Math.sin(a*5+y*2.3)+0.025*Math.sin(a*11-y*4.1)+0.015*Math.sin(a*23+y*9);
    p.setX(i,x*n);p.setZ(i,z*n);
  }
  g.computeVertexNormals();
  return g;
}
const spits=[];
function makeSpit(kind,x){
  const g=new THREE.Group();g.position.set(x,0,-1.7);
  const base=mesh(new THREE.CylinderGeometry(0.75,0.8,0.14,40),M.steel);base.position.y=0.07;g.add(base);
  const rod=mesh(new THREE.CylinderGeometry(0.045,0.045,4.5,12),M.steel);rod.position.y=2.25;g.add(rod);
  const capT=mesh(new THREE.CylinderGeometry(0.12,0.12,0.12,16),M.darkSteel);capT.position.y=4.45;g.add(capT);
  const meat=mesh(meatGeometry(),meatMat[kind]);meat.userData.act={type:'meat',kind};g.add(meat);targets.push(meat);
  const heater=mesh(new THREE.BoxGeometry(1.6,3.6,0.3),M.darkSteel);heater.position.set(0,2.1,-1.05);g.add(heater);
  const hm=new THREE.MeshStandardMaterial({color:'#000',emissive:'#ff7a26',emissiveMap:tex.heater,emissiveIntensity:1.3});
  const face=new THREE.Mesh(new THREE.PlaneGeometry(1.36,3.3),hm);face.position.set(0,2.1,-0.89);g.add(face);
  const light=new THREE.PointLight('#ff8a3a',7,4.5,1.6);light.position.set(0,2.1,-0.5);g.add(light);
  const lbl=new THREE.Mesh(new THREE.PlaneGeometry(1.1,0.27),new THREE.MeshBasicMaterial({map:labelTex(MEATS[kind].name,'#2b1d14','#f2a93b')}));
  lbl.position.set(0,0.12,0.82);lbl.rotation.x=-0.5;g.add(lbl);
  const smoke=[];
  for(let i=0;i<6;i++){
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex.smoke,transparent:true,opacity:0,depthWrite:false}));
    s.userData.t=i/6;g.add(s);smoke.push(s);
  }
  scene.add(g);
  const sp={kind,g,meat,hm,light,smoke,shrink:1};spits.push(sp);return sp;
}
makeSpit('chicken',-4.5);
makeSpit('beef',-2.3);

/* ---------- board + lavash ---------- */
const board=mesh(new THREE.BoxGeometry(3.8,0.16,2.9),M.wood);board.position.set(0.6,0.08,0.75);scene.add(board);
const lavash=new THREE.Group();lavash.position.set(0.6,0.17,0.75);scene.add(lavash);
const lg=new THREE.CircleGeometry(1.35,72);lg.rotateX(-Math.PI/2);
{const p=lg.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,0.012*Math.sin(x*7)+0.01*Math.cos(z*9)+(Math.hypot(x,z)>1.2?0.02:0));}lg.computeVertexNormals();}
const lav=mesh(lg,M.lavash);lav.scale.set(1.15,1,0.95);lavash.add(lav);
const fill=new THREE.Group();lavash.add(fill);

/* ---------- bowls ---------- */
const bowls={};
function bowlGeometry(){
  const pts=[[0,0],[0.42,0],[0.55,0.06],[0.66,0.32],[0.7,0.4],[0.64,0.4],[0.6,0.33],[0.5,0.1],[0,0.1]].map(p=>new THREE.Vector2(p[0],p[1]));
  return new THREE.LatheGeometry(pts,40);
}
const pieceGeo={
  tomato:new THREE.BoxGeometry(0.15,0.1,0.14),
  cucumber:new THREE.CylinderGeometry(0.1,0.1,0.04,18),
  onion:new THREE.TorusGeometry(0.085,0.02,8,22)
};
function piece(kind){
  if(kind==='tomato')return mesh(pieceGeo.tomato,M.tomato);
  if(kind==='cucumber')return mesh(pieceGeo.cucumber,[M.cucSide,M.cucFace,M.cucFace]);
  const m=mesh(pieceGeo.onion,M.onion);m.rotation.x=Math.PI/2;return m;
}
function makeBowl(kind,x,z,label){
  const g=new THREE.Group();g.position.set(x,0,z);
  const b=mesh(bowlGeometry(),M.ceramic);g.add(b);
  for(let i=0;i<26;i++){
    const p=piece(kind),a=rnd(0,6.28),r=rnd(0,0.45);
    p.position.set(Math.cos(a)*r,0.16+rnd(0,0.14)+(0.45-r)*0.25,Math.sin(a)*r);
    p.rotation.set(p.rotation.x+rnd(-0.5,0.5),rnd(0,6.28),rnd(-0.4,0.4));g.add(p);
  }
  const lbl=new THREE.Mesh(new THREE.PlaneGeometry(0.95,0.24),new THREE.MeshBasicMaterial({map:labelTex(label,'#2b1d14','#f6e7c8')}));
  lbl.position.set(0,0.01,0.9);lbl.rotation.x=-Math.PI/2;g.add(lbl);
  g.userData.act={type:'veg',kind};targets.push(g);
  scene.add(g);bowls[kind]=g;
}
makeBowl('onion',2.5,-1.5,'ЛУК');
makeBowl('tomato',3.95,-1.5,'ПОМИДОРЫ');
makeBowl('cucumber',5.4,-1.5,'ОГУРЦЫ');

/* ---------- sauce bottles ---------- */
const bottles={};
function makeBottle(key,x,z){
  const g=new THREE.Group();g.position.set(x,0,z);
  const pts=[[0,0],[0.26,0],[0.29,0.05],[0.29,1.0],[0.24,1.15],[0.12,1.24],[0,1.24]].map(p=>new THREE.Vector2(p[0],p[1]));
  const body=mesh(new THREE.LatheGeometry(pts,32),new THREE.MeshPhysicalMaterial({color:SAUCES[key].c,roughness:0.25,clearcoat:0.8}));g.add(body);
  const nozzle=mesh(new THREE.ConeGeometry(0.07,0.36,16),M.ceramic);nozzle.position.y=1.42;g.add(nozzle);
  const lbl=new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.13),new THREE.MeshBasicMaterial({map:labelTex(SAUCES[key].name,'#2b1d14','#f6e7c8')}));
  lbl.position.set(0,0.55,0.295);g.add(lbl);
  g.userData.act={type:'sauce',key};targets.push(g);
  scene.add(g);bottles[key]=g;
}
makeBottle('garlic',3.7,1.1);
makeBottle('spicy',4.5,1.1);
makeBottle('cheese',5.3,1.1);

/* ---------- knife ---------- */
const knife=new THREE.Group();
{const blade=mesh(new THREE.BoxGeometry(0.95,0.2,0.02),new THREE.MeshStandardMaterial({color:'#e8ecef',metalness:1,roughness:0.15}));blade.position.x=0.48;knife.add(blade);
 const h=mesh(new THREE.BoxGeometry(0.5,0.12,0.07),M.handle);h.position.x=-0.25;knife.add(h);}
knife.visible=false;scene.add(knife);

/* ---------- state ---------- */
function blank(){return {meat:null,meatN:0,tomato:false,cucumber:false,onion:false,sauce:null};}
let state=blank();
function changed(){updateHint();if(window.onKitchenChange)window.onKitchenChange(Object.assign({},state));}
function updateHint(){
  let t;
  if(!state.meatN)t='Проведите по вертелу, чтобы срезать мясо';
  else if(state.meatN<MEAT_NEED)t='Срежьте ещё '+(MEAT_NEED-state.meatN);
  else if(!state.tomato||!state.cucumber)t='Добавьте помидоры и огурцы';
  else if(!state.sauce)t='Лук, если просили, и соус';
  else t='Готово? Нажмите «Подать»';
  hint.textContent=t;
}

/* ---------- flying pieces ---------- */
const flights=[];
function fly(obj,fromWorld,toLocal,dur,arc){
  fill.add(obj);
  const from=fill.worldToLocal(fromWorld.clone());
  obj.position.copy(from);
  flights.push({obj,from,to:toLocal,t:0,dur,arc,spin:new THREE.Vector3(rnd(-6,6),rnd(-6,6),rnd(-6,6)),rot:obj.rotation.clone()});
}
function spot(rx,rz,y){return new THREE.Vector3(rnd(-rx,rx),y,rnd(-rz,rz));}

const stripGeo=(()=>{
  const g=new THREE.PlaneGeometry(0.5,0.15,8,1);const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i);p.setZ(i,-x*x*1.6);}
  g.computeVertexNormals();return g;
})();
function shave(sp,point){
  if(state.meatN>=MEAT_MAX){hint.textContent='Мяса уже достаточно';return;}
  state.meatN++;
  state.meat=!state.meat||state.meat===sp.kind?sp.kind:'mixed';
  sp.shrink=Math.max(0.86,sp.shrink-0.006);sp.meat.scale.set(sp.shrink,1,sp.shrink);
  for(let i=0;i<3;i++){
    const s=mesh(stripGeo,meatMat[sp.kind+'Strip']);
    s.rotation.set(-Math.PI/2+rnd(-0.3,0.3),rnd(0,6.28),rnd(-0.2,0.2));
    fly(s,point,spot(0.75,0.3,0.05+state.meatN*0.012),0.55+i*0.08,1.2);
  }
  changed();
}
function addVeg(kind){
  state[kind]=true;
  const from=bowls[kind].localToWorld(new THREE.Vector3(0,0.4,0));
  for(let i=0;i<6;i++){const p=piece(kind);p.rotation.y=rnd(0,6.28);fly(p,from,spot(0.8,0.35,0.13+rnd(0,0.05)),0.45+i*0.05,0.9);}
  changed();
}
const sauceAnims=[];
function addSauce(key){
  state.sauce=!state.sauce||state.sauce===key?key:'mixed';
  const pts=[];for(let i=0;i<=14;i++)pts.push(new THREE.Vector3(-0.85+i*(1.7/14),0.26,(i%2?0.28:-0.28)+rnd(-0.05,0.05)));
  const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),140,0.035,8);
  const m=mesh(geo,new THREE.MeshPhysicalMaterial({color:SAUCES[key].c,roughness:0.2,clearcoat:1}),false);
  geo.setDrawRange(0,0);fill.add(m);
  sauceAnims.push({geo,t:0,total:geo.index.count});
  const b=bottles[key];b.userData.tilt=1;
  changed();
}

/* ---------- input ---------- */
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
const knifePlane=new THREE.Plane(new THREE.Vector3(0,0,1),0);
let drag=null;
function pick(e){
  const r=renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);
  ray.setFromCamera(ndc,camera);
  const hit=ray.intersectObjects(targets,true)[0];
  if(!hit)return null;
  let o=hit.object;while(o&&!o.userData.act)o=o.parent;
  return o?{act:o.userData.act,point:hit.point}:null;
}
function moveKnife(e,sp){
  knifePlane.constant=-(sp.g.position.z+0.95);
  const p=new THREE.Vector3();
  if(ray.ray.intersectPlane(knifePlane,p)){knife.position.copy(p);knife.rotation.set(0,-0.5,-0.35);knife.visible=true;}
}
const el=renderer.domElement;
el.addEventListener('pointerdown',e=>{
  const h=pick(e);if(!h)return;
  if(h.act.type==='meat'){
    const sp=spits.find(s=>s.kind===h.act.kind);
    drag={sp,x:e.clientX,y:e.clientY,acc:0};el.setPointerCapture(e.pointerId);
    moveKnife(e,sp);shave(sp,h.point);
  }else if(h.act.type==='veg')addVeg(h.act.kind);
  else if(h.act.type==='sauce')addSauce(h.act.key);
});
el.addEventListener('pointermove',e=>{
  if(drag){
    drag.acc+=Math.hypot(e.clientX-drag.x,e.clientY-drag.y);drag.x=e.clientX;drag.y=e.clientY;
    pick(e);moveKnife(e,drag.sp);
    while(drag.acc>=60){
      drag.acc-=60;
      const p=new THREE.Vector3();ray.ray.intersectPlane(knifePlane,p);
      p.set(drag.sp.g.position.x,THREE.MathUtils.clamp(p.y,0.6,3.4),drag.sp.g.position.z+0.7);
      shave(drag.sp,p);
    }
    return;
  }
  el.style.cursor=pick(e)?'pointer':'default';
});
function endDrag(){drag=null;setTimeout(()=>{if(!drag)knife.visible=false;},250);}
el.addEventListener('pointerup',endDrag);el.addEventListener('pointercancel',endDrag);

/* ---------- wrap + reset ---------- */
let wrapAnim=null;
function clearFill(){
  flights.length=0;sauceAnims.length=0;
  for(const c of [...fill.children]){fill.remove(c);if(c.geometry&&c.geometry.type==='TubeGeometry')c.geometry.dispose();}
}
function reset(){clearFill();lavash.scale.set(1,1,1);lavash.position.y=0.17;state=blank();changed();}
function wrap(done){
  wrapAnim={t:0,done};
  for(const f of flights){f.obj.position.copy(f.to);}flights.length=0;
}

/* ---------- size + loop ---------- */
let visible=false;
function resize(){
  const w=root.clientWidth,h=root.clientHeight;if(!w||!h)return;
  renderer.setSize(w,h,false);camera.aspect=w/h;
  camera.fov=w/h<1.2?52:38;                /* narrow phones: widen the view so the counter fits */
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(root);

const clock=new THREE.Clock();
function frame(){
  requestAnimationFrame(frame);
  const dt=Math.min(clock.getDelta(),0.05),t=clock.elapsedTime;
  if(!visible)return;
  for(const sp of spits){
    sp.meat.rotation.y+=dt*0.45;
    const fl=1.25+Math.sin(t*7+sp.g.position.x)*0.08+Math.sin(t*13)*0.05;
    sp.hm.emissiveIntensity=fl;sp.light.intensity=fl*5.5;
    for(const s of sp.smoke){
      s.userData.t=(s.userData.t+dt*0.18)%1;const k=s.userData.t;
      s.position.set(Math.sin(k*8+s.id)*0.25,3.7+k*2.2,0.1);
      s.scale.setScalar(0.5+k*1.4);s.material.opacity=Math.sin(k*Math.PI)*0.13;
    }
  }
  for(let i=flights.length-1;i>=0;i--){
    const f=flights[i];f.t+=dt/f.dur;const k=Math.min(f.t,1);
    f.obj.position.lerpVectors(f.from,f.to,k);f.obj.position.y+=Math.sin(k*Math.PI)*f.arc;
    if(k<1){f.obj.rotation.set(f.rot.x+f.spin.x*(1-k)*0.1,f.rot.y+f.spin.y*k*0.2,f.rot.z+f.spin.z*(1-k)*0.1);}
    else{f.obj.rotation.copy(f.rot);flights.splice(i,1);}
  }
  for(let i=sauceAnims.length-1;i>=0;i--){
    const a=sauceAnims[i];a.t+=dt/0.6;
    const n=Math.floor(Math.min(a.t,1)*a.total/3)*3;a.geo.setDrawRange(0,n);
    if(a.t>=1)sauceAnims.splice(i,1);
  }
  for(const k in bottles){
    const b=bottles[k];
    if(b.userData.tilt>0){b.userData.tilt=Math.max(0,b.userData.tilt-dt*1.6);const s=Math.sin(b.userData.tilt*Math.PI);
      b.rotation.z=s*0.9;b.position.y=s*0.6;b.scale.set(1+s*0.06,1-s*0.06,1+s*0.06);}
  }
  if(wrapAnim){
    wrapAnim.t+=dt/0.75;const k=Math.min(wrapAnim.t,1);
    if(k<0.55){const q=k/0.55;lavash.scale.set(1,1+q*0.6,1-q*0.72);}
    else{const q=(k-0.55)/0.45;lavash.scale.set(1-q,1.6*(1-q),0.28*(1-q));lavash.position.y=0.17+q*1.5;}
    if(k>=1){const done=wrapAnim.done;wrapAnim=null;reset();if(done)done();}
  }
  renderer.render(scene,camera);
}
frame();

window.Kitchen={
  show(){root.hidden=false;visible=true;resize();},
  hide(){root.hidden=true;visible=false;},
  reset,wrap,
  get state(){return Object.assign({},state);},
  MEAT_NEED
};
updateHint();
document.dispatchEvent(new Event('kitchenready'));
