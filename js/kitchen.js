/* 3D open kitchen: two doner spits, cutting board with lavash, vegetables, sauces and drinks.
   The hall (js/hall.js) lives in the same scene; the camera flies between the two views.
   Talks to the game through window.Kitchen (setView/reset/wrap/state) and window.onKitchenChange(state). */
import * as THREE from 'three';
import {RoomEnvironment} from '../vendor/RoomEnvironment.js';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';

const MEATS={
  chicken:{name:'КУРИЦА',base:'#B9732E',dark:'#5A2E0E',light:'#E2A453'},
  beef:{name:'ГОВЯДИНА',base:'#7A3A20',dark:'#2E1408',light:'#A9603F'}
};
const SAUCES={garlic:{name:'ЧЕСНОК',c:'#F4ECD6'},spicy:{name:'ОСТРЫЙ',c:'#C8321E'},cheese:{name:'СЫРНЫЙ',c:'#F0B92E'}};
const MEAT_NEED=3,MEAT_MAX=8;
const perks={knife:1,grill:1,pour:1};   /* multipliers from shop upgrades */

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
key.position.set(9,24,20);key.target.position.set(3,0,6);scene.add(key.target);key.castShadow=true;
key.shadow.mapSize.setScalar(Math.min(window.innerWidth,window.innerHeight)<700?1024:2048);
Object.assign(key.shadow.camera,{left:-17,right:17,top:17,bottom:-17,near:1,far:70});
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
const wall=mesh(new THREE.PlaneGeometry(26,24),M.wall,false);wall.position.set(0,9,-3.4);scene.add(wall);
const top=mesh(new THREE.BoxGeometry(14,0.25,5.2),M.steel,false);top.position.set(0,-0.125,-0.6);scene.add(top);
/* under-counter steel fridges, like a real shawarma kitchen */
const fridgeTex=canvasTex(1024,220,(g,w,h)=>{
  g.drawImage(tex.steel.image,0,0,w,h);
  for(let i=0;i<6;i++){
    const x=i*w/6;g.strokeStyle='rgba(30,30,30,.55)';g.lineWidth=4;g.strokeRect(x+6,10,w/6-12,h-24);
    g.fillStyle='#d9dde1';g.fillRect(x+18,28,w/6-36,8);g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x+18,36,w/6-36,3);
    g.fillStyle='rgba(20,20,20,.5)';for(let k=0;k<5;k++)g.fillRect(x+w/12-22,h-46+k*6,44,2);
  }
});
const front=mesh(new THREE.BoxGeometry(14,3,0.2),new THREE.MeshStandardMaterial({map:fridgeTex,metalness:0.8,roughness:0.35}),false);
front.position.set(0,-1.6,2);scene.add(front);
const plinth=mesh(new THREE.BoxGeometry(14,3,5),M.darkSteel,false);plinth.position.set(0,-1.6,-0.6);scene.add(plinth);

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
let lavashY=0.17;
const lavash=new THREE.Group();lavash.position.set(0.6,lavashY,0.75);scene.add(lavash);
const lg=new THREE.CircleGeometry(1.35,72);lg.rotateX(-Math.PI/2);
{const p=lg.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,0.012*Math.sin(x*7)+0.01*Math.cos(z*9)+(Math.hypot(x,z)>1.2?0.02:0));}lg.computeVertexNormals();}
const lav=mesh(lg,M.lavash);lav.scale.set(1.15,1,0.95);lavash.add(lav);
const fill=new THREE.Group();lavash.add(fill);

/* ---------- bain-marie: a steel insert with ten trays of toppings, like a real shawarma counter ---------- */
const INGREDIENTS={
  tomato:'ПОМИДОР',cucumber:'ОГУРЕЦ',onion:'ЛУК',cabbage:'КАПУСТА',carrot:'МОРКОВЬ',
  fries:'ФРИ',cheese:'СЫР',jalapeno:'ХАЛАПЕНЬО',pickle:'СОЛ. ОГУРЕЦ',greens:'ЗЕЛЕНЬ'
};
const ING_KEYS=Object.keys(INGREDIENTS);
const IM=(c,r=0.5)=>new THREE.MeshPhysicalMaterial({color:c,roughness:r,clearcoat:0.3});
const pieceDef={
  tomato:[new THREE.BoxGeometry(0.15,0.1,0.14),M.tomato],
  cucumber:[new THREE.CylinderGeometry(0.1,0.1,0.04,16),[M.cucSide,M.cucFace,M.cucFace]],
  onion:[new THREE.TorusGeometry(0.085,0.02,8,20),M.onion,true],
  cabbage:[new THREE.BoxGeometry(0.24,0.015,0.05),IM('#e3ecbd',0.6)],
  carrot:[new THREE.BoxGeometry(0.3,0.025,0.025),IM('#f0761c',0.4)],
  fries:[new THREE.BoxGeometry(0.32,0.055,0.055),IM('#f2c14e',0.6)],
  cheese:[new THREE.BoxGeometry(0.07,0.035,0.05),IM('#f5d76e',0.45)],
  jalapeno:[new THREE.TorusGeometry(0.055,0.02,8,16),IM('#3f8f2a',0.35),true],
  pickle:[new THREE.CylinderGeometry(0.11,0.11,0.035,16),[IM('#55702f'),IM('#a6bb6c'),IM('#a6bb6c')]],
  greens:[new THREE.BoxGeometry(0.13,0.012,0.06),IM('#3f9a3a',0.6)]
};
function piece(kind){
  const d=pieceDef[kind],m=mesh(d[0],d[1]);if(d[2])m.rotation.x=Math.PI/2;return m;
}
const bowls={};   /* kind -> tray group (name kept from the old bowls) */
{
  const cols=5,dx=0.8,x0=2.9,rows=[1.5,0.62];
  const frame=mesh(new THREE.BoxGeometry(cols*dx+0.25,0.1,rows[0]-rows[1]+1.05),M.steel);
  frame.position.set(x0+(cols-1)*dx/2,0.02,(rows[0]+rows[1])/2);scene.add(frame);
  ING_KEYS.forEach((kind,i)=>{
    const g=new THREE.Group();g.position.set(x0+(i%cols)*dx,0,rows[Math.floor(i/cols)]);
    const tray=mesh(new THREE.BoxGeometry(0.76,0.16,0.8),M.darkSteel);tray.position.y=0.06;g.add(tray);
    const rim=mesh(new THREE.BoxGeometry(0.78,0.03,0.82),M.steel);rim.position.y=0.14;g.add(rim);
    for(let k=0;k<18;k++){
      const p=piece(kind);p.position.set(rnd(-0.28,0.28),0.16+rnd(0,0.08),rnd(-0.28,0.28));
      p.rotation.set(p.rotation.x+rnd(-0.4,0.4),rnd(0,6.28),rnd(-0.3,0.3));g.add(p);
    }
    const tag=new THREE.Mesh(new THREE.PlaneGeometry(0.74,0.2),new THREE.MeshBasicMaterial({map:labelTex(INGREDIENTS[kind],'#2b1d14','#f6e7c8')}));
    tag.position.set(0,0.36,-0.4);tag.rotation.x=-0.35;g.add(tag);
    g.userData.act={type:'veg',kind};targets.push(g);scene.add(g);bowls[kind]=g;
  });
}

/* ---------- sauce bottles ---------- */
const bottles={};
function makeBottle(key,x,z){
  const g=new THREE.Group();g.position.set(x,0,z);
  const pts=[[0,0],[0.26,0],[0.29,0.05],[0.29,1.0],[0.24,1.15],[0.12,1.24],[0,1.24]].map(p=>new THREE.Vector2(p[0],p[1]));
  const body=mesh(new THREE.LatheGeometry(pts,32),new THREE.MeshPhysicalMaterial({color:SAUCES[key].c,roughness:0.25,clearcoat:0.8}));g.add(body);
  const nozzle=mesh(new THREE.ConeGeometry(0.07,0.36,16),M.ceramic);nozzle.position.y=1.42;g.add(nozzle);
  const lbl=new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.13),new THREE.MeshBasicMaterial({map:labelTex(SAUCES[key].name,'#2b1d14','#f6e7c8')}));
  lbl.position.set(0,0.55,0.295);g.add(lbl);
  g.userData.act={type:'sauce',key};targets.push(g);g.userData.stub=[body,nozzle];g.userData.label=lbl;
  scene.add(g);bottles[key]=g;
}
makeBottle('garlic',3.6,-1.75);
makeBottle('spicy',4.6,-1.75);
makeBottle('cheese',5.6,-1.75);

/* ---------- contact grill: the wrapped shawarma is pressed here until golden ---------- */
const grill=new THREE.Group();grill.position.set(1.0,0,-2.05);scene.add(grill);
const grillLid=new THREE.Group();
{
  const base=mesh(new THREE.BoxGeometry(2.4,0.45,1.5),M.steel);base.position.y=0.225;grill.add(base);
  const ribs=canvasTex(256,128,(g,w,h)=>{g.fillStyle='#2a2a2a';g.fillRect(0,0,w,h);g.fillStyle='#4a4a4a';for(let x=6;x<w;x+=16)g.fillRect(x,0,7,h);});
  const plate=mesh(new THREE.BoxGeometry(2.1,0.05,1.2),new THREE.MeshStandardMaterial({map:ribs,metalness:0.6,roughness:0.5}));plate.position.y=0.47;grill.add(plate);
  for(const x of [-0.85,0.85]){const k=mesh(new THREE.CylinderGeometry(0.07,0.07,0.08,12),M.handle);k.rotation.x=Math.PI/2;k.position.set(x,0.22,0.78);grill.add(k);}
  grillLid.position.set(0,0.5,-0.72);grill.add(grillLid);
  const lid=mesh(new THREE.BoxGeometry(2.3,0.22,1.45),M.darkSteel);lid.position.set(0,0.11,0.72);grillLid.add(lid);
  const handle=mesh(new THREE.BoxGeometry(1.8,0.08,0.08),M.handle);handle.position.set(0,0.2,1.5);grillLid.add(handle);
  const lbl=new THREE.Mesh(new THREE.PlaneGeometry(1.0,0.25),new THREE.MeshBasicMaterial({map:labelTex('ГРИЛЬ','#2b1d14','#f2a93b')}));
  lbl.rotation.x=-Math.PI/2;lbl.position.set(0,0.01,1.0);grill.add(lbl);
}
grill.userData.act={type:'grill'};targets.push(grill);
const rollMat=new THREE.MeshStandardMaterial({map:tex.lavash,roughness:0.85});
const roll=mesh(new THREE.CylinderGeometry(0.3,0.3,1.7,24),rollMat);roll.rotation.z=Math.PI/2;roll.visible=false;scene.add(roll);
const LAVASH_C=new THREE.Color('#ffffff'),GOLD_C=new THREE.Color('#d8954a'),BURNT_C=new THREE.Color('#3a2414');
function toastColor(k,out){
  return k<=0.8?out.copy(LAVASH_C).lerp(GOLD_C,k/0.8):out.copy(GOLD_C).lerp(BURNT_C,Math.min(1,(k-0.8)/0.6));
}
const TOAST_OK=0.55,TOAST_MAX=1.0,TOAST_BURNT=1.2;
function toastLabel(k){return k<TOAST_OK?'бледная':k<=TOAST_MAX?'золотистая':k<=TOAST_BURNT?'подгорает!':'сгорела';}

/* ---------- drinks: hold a jug to pour into the glass; the green ring marks "full enough" ---------- */
const DRINKS={tea:{name:'ЧАЙ',c:'#9a4a1c',op:0.85},ayran:{name:'АЙРАН',c:'#f3efe4',op:0.97},cola:{name:'КОЛА',c:'#2a0f06',op:0.92}};
const FILL_OK=0.7,FILL_MAX=1.02,GLASS_H=0.85,GLASS_R=0.26;
const glass=new THREE.Group();glass.position.set(-2.05,0,1.4);scene.add(glass);
{
  const shell=new THREE.Mesh(new THREE.CylinderGeometry(GLASS_R+0.03,GLASS_R-0.02,GLASS_H,32,1,true),
    new THREE.MeshPhysicalMaterial({color:'#ffffff',roughness:0.05,transparent:true,opacity:0.3,clearcoat:1,side:THREE.DoubleSide,depthWrite:false}));
  shell.position.y=GLASS_H/2;shell.renderOrder=2;glass.add(shell);
  const bottom=mesh(new THREE.CylinderGeometry(GLASS_R-0.02,GLASS_R-0.02,0.05,32),new THREE.MeshPhysicalMaterial({color:'#dfe8ea',roughness:0.1,transparent:true,opacity:0.6}));
  bottom.position.y=0.025;glass.add(bottom);
  const mark=new THREE.Mesh(new THREE.TorusGeometry(GLASS_R+0.035,0.01,6,40),new THREE.MeshBasicMaterial({color:'#8fb339'}));
  mark.rotation.x=Math.PI/2;mark.position.y=0.05+FILL_OK*(GLASS_H-0.1);glass.add(mark);
  const lbl=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.22),new THREE.MeshBasicMaterial({map:labelTex('СТАКАН','#2b1d14','#f6e7c8')}));
  lbl.rotation.x=-Math.PI/2;lbl.position.set(0,0.01,0.55);glass.add(lbl);
}
const liquidMat=new THREE.MeshPhysicalMaterial({color:'#9a4a1c',roughness:0.1,transparent:true,opacity:0.9,clearcoat:1});
const liquid=new THREE.Mesh(new THREE.CylinderGeometry(GLASS_R-0.01,GLASS_R-0.03,1,32),liquidMat);liquid.visible=false;glass.add(liquid);
const spill=new THREE.Mesh(new THREE.CircleGeometry(0.55,32),liquidMat);spill.rotation.x=-Math.PI/2;spill.position.y=0.006;spill.visible=false;glass.add(spill);
const stream=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,1,10),liquidMat);stream.visible=false;scene.add(stream);
glass.userData.act={type:'glass'};targets.push(glass);

const jugs={};
function makeJug(key,x,z){
  const g=new THREE.Group();g.position.set(x,0,z);g.userData.home=g.position.clone();g.userData.p=0;
  const v=pts=>pts.map(p=>new THREE.Vector2(p[0],p[1]));
  let body;
  if(key==='cola'){
    body=mesh(new THREE.LatheGeometry(v([[0,0],[0.24,0],[0.25,0.04],[0.25,0.8],[0.12,1.05],[0.09,1.3],[0.1,1.36],[0,1.36]]),32),
      new THREE.MeshPhysicalMaterial({color:'#3a1408',roughness:0.05,clearcoat:1}));
    const cap=mesh(new THREE.CylinderGeometry(0.1,0.1,0.08,16),new THREE.MeshStandardMaterial({color:'#c8201c',roughness:0.4}));cap.position.y=1.4;g.add(cap);
    const band=mesh(new THREE.CylinderGeometry(0.256,0.256,0.3,32,1,true),new THREE.MeshStandardMaterial({color:'#c8201c',roughness:0.5}));band.position.y=0.45;g.add(band);
  }else{
    const tea=key==='tea';
    body=mesh(new THREE.LatheGeometry(v(tea?[[0,0],[0.3,0],[0.42,0.15],[0.45,0.4],[0.38,0.65],[0.2,0.75],[0.12,0.8],[0,0.8]]
                                          :[[0,0],[0.26,0],[0.3,0.1],[0.3,0.8],[0.22,1.0],[0.24,1.1],[0,1.1]]),32),
      new THREE.MeshPhysicalMaterial({color:tea?'#b4502a':'#f4f0e6',roughness:0.2,clearcoat:0.8}));
    const spout=mesh(new THREE.CylinderGeometry(0.04,0.07,0.45,12),body.material);
    spout.position.set(tea?0.5:0.3,tea?0.5:0.95,0);spout.rotation.z=-0.9;g.add(spout);
    if(tea){const lid=mesh(new THREE.SphereGeometry(0.12,16,8),body.material);lid.position.y=0.82;g.add(lid);}
  }
  g.add(body);
  const lbl=new THREE.Mesh(new THREE.PlaneGeometry(0.75,0.19),new THREE.MeshBasicMaterial({map:labelTex(DRINKS[key].name,'#2b1d14','#f6e7c8')}));
  lbl.rotation.x=-Math.PI/2;lbl.position.set(x,0.01,z+0.6);scene.add(lbl);   /* stays on the counter while the jug pours */
  g.userData.spout=key==='tea'?new THREE.Vector3(0.68,0.64,0):key==='ayran'?new THREE.Vector3(0.47,1.09,0):new THREE.Vector3(0,1.4,0);
  g.userData.act={type:'drink',key};targets.push(g);scene.add(g);jugs[key]=g;
}
makeJug('tea',-4.75,1.3);makeJug('ayran',-3.85,1.3);makeJug('cola',-3.0,1.3);
let pouring=null,pourTick=0;
function startPour(key){
  pouring={key};cook.x=jugs[key].userData.home.x;
  state.drink=!state.drink||state.drink===key?key:'mixed';
  liquidMat.color.set(state.drink==='mixed'?'#6b4a2a':DRINKS[key].c);liquidMat.opacity=DRINKS[key].op;
  if(window.Sfx)Sfx.loop('pour',true);
}
function stopPour(){
  if(!pouring)return;
  pouring=null;stream.visible=false;if(window.Sfx)Sfx.loop('pour',false);changed();
}
function emptyGlass(){state.drink=null;state.fill=0;if(window.Sfx)Sfx.play('click');changed();}
const SPOUT_Y=2.5;   /* jugs are lifted so the spout sits this high, right above the glass */
const _sp=new THREE.Vector3();
function updateDrinks(dt){
  for(const k in jugs){
    const j=jugs[k],on=!!(pouring&&pouring.key===k);
    j.userData.p=THREE.MathUtils.clamp(j.userData.p+(on?dt:-dt)*3.5,0,1);
    const p=j.userData.p,e=p*p*(3-2*p);
    j.position.copy(j.userData.home);j.rotation.z=-1.9*e;
    if(p>0){
      /* move the tilted jug so its spout ends up over the middle of the glass, up high */
      j.updateMatrixWorld();_sp.copy(j.userData.spout);j.localToWorld(_sp);
      j.position.x+=(glass.position.x-_sp.x)*e;j.position.z+=(glass.position.z-_sp.z)*e;j.position.y+=(SPOUT_Y-_sp.y)*e;
    }
  }
  if(pouring&&jugs[pouring.key].userData.p>0.95){
    state.fill+=dt*0.3*perks.pour;
    const top=0.05+Math.min(state.fill,1)*(GLASS_H-0.1),y0=SPOUT_Y;
    stream.visible=true;stream.scale.y=Math.max(0.01,y0-top);
    stream.position.set(glass.position.x,(y0+top)/2,glass.position.z);
    if(window.Sfx)Sfx.pourLevel(Math.min(state.fill,1));
    pourTick+=dt;if(pourTick>0.12){pourTick=0;changed();}
  }else stream.visible=false;
  const h=Math.min(state.fill,1)*(GLASS_H-0.1);
  liquid.visible=state.fill>0.01;liquid.scale.y=Math.max(h,0.001);liquid.position.y=0.05+h/2;
  spill.visible=state.fill>FILL_MAX;spill.scale.setScalar(Math.min(1,0.3+(state.fill-FILL_MAX)*4));
}

/* ---------- kitchen dressing: hood over the spits, wall shelf, digital menu boards ---------- */
{
  const hood=mesh(new THREE.BoxGeometry(5.6,1.1,2.4),M.steel);hood.position.set(-3.6,6.4,-2.2);scene.add(hood);
  const lip=mesh(new THREE.BoxGeometry(5.8,0.25,2.6),M.steel);lip.position.set(-3.6,5.8,-2.1);scene.add(lip);
  const duct=mesh(new THREE.BoxGeometry(1.4,6,1.2),M.steel,false);duct.position.set(-3.6,9.9,-2.8);scene.add(duct);
  const shelf=mesh(new THREE.BoxGeometry(5.2,0.12,0.9),M.steel);shelf.position.set(3.4,4.3,-2.95);scene.add(shelf);
  for(const x of [1.2,5.6]){const br=mesh(new THREE.BoxGeometry(0.08,0.6,0.8),M.steel);br.position.set(x,4.0,-2.95);scene.add(br);}
  for(let i=0;i<5;i++){
    const c=mesh(new THREE.BoxGeometry(0.75,0.45+((i*7)%3)*0.12,0.7),M.steel);c.position.set(1.4+i*0.95,4.36+c.geometry.parameters.height/2,-2.95);scene.add(c);
  }
}
/* green digital menu boards above the kitchen; the shawarma photo is drawn in once it loads */
const menuBoards=[];
function menuCanvas(g,w,h,title,rows){
  const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#1f8a3a');gr.addColorStop(1,'#11612a');
  g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.fillStyle='#ffd23a';g.font='800 58px Onest,Arial,sans-serif';g.textAlign='left';g.fillText(title,34,74);
  g.fillStyle='rgba(255,255,255,.25)';g.fillRect(34,92,w-68,3);
  g.font='600 33px Onest,Arial,sans-serif';
  rows.forEach((r,i)=>{const y=146+i*56;g.fillStyle='#ffffff';g.fillText(r[0],34,y);g.fillStyle='#ffd23a';g.textAlign='right';g.fillText(r[1],w-34,y);g.textAlign='left';});
}
const BOARDS=[
  {x:-4.6,title:'ШАВЕРМА',rows:[['Классическая','250 ₽'],['Говяжья','270 ₽'],['Острая','270 ₽'],['Сырная','280 ₽'],['С картошкой','290 ₽']]},
  {x:0.2,title:'ШАВЕРМА',rows:[['По-корейски','290 ₽'],['Деревенская','290 ₽'],['Овощная','220 ₽'],['Мексиканская','300 ₽'],['XL Мега','380 ₽']]},
  {x:5.0,title:'НАПИТКИ',rows:[['Чай','60 ₽'],['Айран','60 ₽'],['Кола','60 ₽'],['Из холодильника','80 ₽']]}
];
for(const b of BOARDS){
  const t=canvasTex(640,400,(g,w,h)=>menuCanvas(g,w,h,b.title,b.rows));
  const m=new THREE.Mesh(new THREE.PlaneGeometry(4.5,2.8),new THREE.MeshBasicMaterial({map:t,toneMapped:false}));
  m.position.set(b.x,7.75,-3.3);scene.add(m);
  const frame=mesh(new THREE.BoxGeometry(4.7,3.0,0.12),M.darkSteel,false);frame.position.set(b.x,7.75,-3.37);scene.add(frame);
  menuBoards.push({b,t});
}
{
  const img=new Image();img.src='assets/textures/shawarma.png';
  img.onload=()=>{for(const mb of menuBoards)if(mb.b.img){const g=mb.t.image.getContext('2d');g.drawImage(img,470,170,84,221);mb.t.needsUpdate=true;}};
}

/* ---------- knife ---------- */
const knife=new THREE.Group();
{const blade=mesh(new THREE.BoxGeometry(0.95,0.2,0.02),new THREE.MeshStandardMaterial({color:'#e8ecef',metalness:1,roughness:0.15}));blade.position.x=0.48;knife.add(blade);
 const h=mesh(new THREE.BoxGeometry(0.5,0.12,0.07),M.handle);h.position.x=-0.25;knife.add(h);}
knife.visible=false;scene.add(knife);

/* ---------- state ---------- */
function blank(){return {meat:null,meatN:0,ing:{},sauce:null,drink:null,fill:0,stage:'build',toast:0};}
let order=null;   /* the selected guest's order, only used for hints */
let state=blank();
function changed(){updateHint();if(window.onKitchenChange)window.onKitchenChange(Object.assign({},state,{ing:Object.assign({},state.ing)}));}
function updateHint(){
  let t;
  if(state.stage==='rolling'){hint.textContent='Заворачиваем…';return;}
  if(state.stage==='grill'){
    hint.textContent=order&&order.drink&&(state.drink!==order.drink||state.fill<FILL_OK)?'Пока жарится, налейте '+DRINKS[order.drink].name.toLowerCase():
      (state.toast<TOAST_OK?'Жарим… ждём, пока станет золотистой':state.toast<=TOAST_MAX?'Золотистая! Нажмите «Подать»':state.toast<=TOAST_BURNT?'Подгорает! Скорее подавайте':'Сгорела… можно подать, но гость будет недоволен');return;
  }
  const needMeat=order?order.meatN:MEAT_NEED,missing=order?order.ing.filter(k=>!state.ing[k]):[];
  if(needMeat&&!state.meatN)t='Ведите пальцем вверх-вниз по вертелу — нож срежет мясо';
  else if(state.meatN<needMeat)t='Срежьте ещё '+(needMeat-state.meatN);
  else if(missing.length)t='Добавьте: '+missing.map(k=>INGREDIENTS[k].toLowerCase()).join(', ');
  else if(!state.sauce)t='Полейте соусом';
  else if(state.fill>FILL_MAX)t='Перелили! Нажмите на стакан, чтобы вылить';
  else if(order&&order.drink&&(state.drink!==order.drink||state.fill<FILL_OK))t='Налейте '+DRINKS[order.drink].name.toLowerCase()+': держите палец на кувшине до зелёной черты';
  else t='Готово? Нажмите «Завернуть»';
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
let slivers=0;
/* one thin strip of meat leaves the knife and lands on the lavash */
function sliver(sp){
  if(state.meatN>=MEAT_MAX||slivers>60)return;
  slivers++;
  const s=mesh(stripGeo,meatMat[sp.kind+'Strip']);
  s.rotation.set(-Math.PI/2+rnd(-0.3,0.3),rnd(0,6.28),rnd(-0.2,0.2));s.scale.setScalar(rnd(0.7,1.05));
  fly(s,knife.position.clone().add(new THREE.Vector3(-0.3,0,0)),spot(0.75,0.3,0.05+slivers*0.004),0.5,1.0);
  if(window.Sfx)Sfx.play('sliver');
}
/* every so often the slivers add up to a counted portion */
function portion(sp){
  if(state.meatN>=MEAT_MAX){hint.textContent='Мяса уже достаточно';return;}
  state.meatN=Math.min(MEAT_MAX,state.meatN+perks.knife);cook.x=sp.g.position.x;
  state.meat=!state.meat||state.meat===sp.kind?sp.kind:'mixed';
  if(window.Sfx)Sfx.play('shave');if(navigator.vibrate)navigator.vibrate(8);
  sp.shrink=Math.max(0.86,sp.shrink-0.006);sp.meat.scale.set(sp.shrink,1,sp.shrink);
  changed();
}
function addVeg(kind){
  state.ing[kind]=true;cook.x=bowls[kind].position.x;if(window.Sfx)Sfx.play('drop');
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
  const b=bottles[key];b.userData.tilt=1;cook.x=b.position.x;if(window.Sfx)Sfx.play('squeeze');
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
const knifeTarget=new THREE.Vector3();
/* the knife glides on the front of the cone at the finger's height */
function moveKnife(e,sp){
  knifePlane.constant=-(sp.g.position.z+0.95);
  const p=new THREE.Vector3();
  if(ray.ray.intersectPlane(knifePlane,p)){
    const y=THREE.MathUtils.clamp(p.y,0.6,3.4),t=(y-0.36)/3.1,r=(0.52+0.32*Math.pow(Math.max(t,0),1.3))*sp.shrink;
    knifeTarget.set(sp.g.position.x+0.35,y,sp.g.position.z+r+0.12);
    if(!knife.visible){knife.position.copy(knifeTarget);knife.visible=true;}
    knife.rotation.set(0,0.35,-0.12);
  }
}
const el=renderer.domElement;
el.addEventListener('pointerdown',e=>{
  if(view!=='kitchen')return;
  const h=pick(e);if(!h)return;
  if(h.act.type==='meat'){
    const sp=spits.find(s=>s.kind===h.act.kind);
    drag={sp,x:e.clientX,y:e.clientY,acc:0,sliver:0};el.setPointerCapture(e.pointerId);
    moveKnife(e,sp);sliver(sp);
  }else if(h.act.type==='veg')addVeg(h.act.kind);
  else if(h.act.type==='sauce')addSauce(h.act.key);
  else if(h.act.type==='drink'){startPour(h.act.key);el.setPointerCapture(e.pointerId);}
  else if(h.act.type==='glass')emptyGlass();
  else if(h.act.type==='grill'&&state.stage==='grill'){const b=document.getElementById('serve');if(b)b.click();}
});
el.addEventListener('pointermove',e=>{
  if(drag){
    const d=Math.hypot(e.clientX-drag.x,e.clientY-drag.y);drag.x=e.clientX;drag.y=e.clientY;
    drag.acc+=d;drag.sliver+=d;
    pick(e);moveKnife(e,drag.sp);
    /* a thin sliver every few pixels of knife travel, a full portion every ~55px */
    while(drag.sliver>=16){drag.sliver-=16;sliver(drag.sp);}
    while(drag.acc>=55){drag.acc-=55;portion(drag.sp);}
    return;
  }
  if(view==='kitchen')el.style.cursor=pick(e)?'pointer':'default';
});
function endDrag(){stopPour();drag=null;setTimeout(()=>{if(!drag)knife.visible=false;},250);}
el.addEventListener('pointerup',endDrag);el.addEventListener('pointercancel',endDrag);

/* ---------- wrap + reset ---------- */
let wrapAnim=null;
function clearFill(){
  flights.length=0;sauceAnims.length=0;slivers=0;
  for(const c of [...fill.children]){fill.remove(c);if(c.geometry&&c.geometry.type==='TubeGeometry')c.geometry.dispose();}
}
function reset(){
  clearFill();lavash.scale.set(1,1,1);lavash.position.y=lavashY;
  roll.visible=false;served.visible=false;lidTarget=1;
  state=blank();changed();
}
/* step 1: roll the lavash and lay it on the grill; it toasts until taken off */
function rollUp(){
  if(state.stage!=='build'||wrapAnim)return;
  stopPour();state.stage='rolling';wrapAnim={t:0,mode:'roll'};cook.x=lavash.position.x;if(window.Sfx)Sfx.play('wrap');
  for(const f of flights){f.obj.position.copy(f.to);}flights.length=0;
  changed();
}
/* step 2: lift the lid, show the finished shawarma, then clear the board for the next order */
function takeOff(done){
  if(state.stage!=='grill'||wrapAnim)return;
  wrapAnim={t:0,mode:'take',done};cook.x=grill.position.x;lidTarget=1;
}

/* ---------- free Poly Haven assets (CC0); procedural stand-ins stay until they load ---------- */
const PH='assets/polyhaven/';
const gltf=new GLTFLoader(),texLoader=new THREE.TextureLoader();
/* Fit a loaded model: centred on x/z, resting on y=0, widest horizontal side = width. */
function fitted(root,width){
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3());
  const k=width/Math.max(size.x,size.z);
  root.scale.setScalar(k);
  const b2=new THREE.Box3().setFromObject(root),c=b2.getCenter(new THREE.Vector3());
  root.position.set(-c.x,-b2.min.y,-c.z);
  const g=new THREE.Group();g.add(root);g.userData.height=b2.max.y-b2.min.y;return g;
}
function loadModel(name,width){
  return new Promise(res=>gltf.load(PH+name+'/'+name+'.gltf',d=>res(fitted(d.scene,width)),undefined,()=>res(null)));
}
function pbr(name,repeat,mat,rotation=0){
  const f=k=>{const t=texLoader.load(PH+name+'/'+name+'_'+k+'_1k.jpg');t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.copy(repeat);t.rotation=rotation;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;};
  const map=f('diffuse');map.colorSpace=THREE.SRGBColorSpace;
  mat.map=map;mat.normalMap=f('nor_gl');mat.roughnessMap=f('rough');mat.roughness=1;mat.color.set('#ffffff');mat.needsUpdate=true;
}
/* photo texture of real doner meat (made from the user's reference photo); procedural meat stays until it loads */
{
  const bump=texLoader.load('assets/textures/doner-bump.jpg');bump.wrapS=THREE.RepeatWrapping;bump.repeat.set(2,1);
  for(const k in MEATS){
    texLoader.load('assets/textures/doner-'+k+'.jpg',t=>{
      t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;t.repeat.set(2,1);t.anisotropy=renderer.capabilities.getMaxAnisotropy();
      for(const m of [meatMat[k],meatMat[k+'Strip']]){m.map=t;m.bumpMap=bump;m.bumpScale=1.6;m.needsUpdate=true;}
    });
  }
}
pbr('long_white_tiles',new THREE.Vector2(2.9,4),M.wall,Math.PI/2);  /* rotated: horizontal metro tiles */
pbr('kitchen_wood',new THREE.Vector2(4,4),M.wood);
loadModel('wooden_cutting_board',3.9).then(m=>{
  if(!m)return;
  m.position.copy(board.position).setY(0);scene.add(m);board.visible=false;
  lavashY=m.userData.height+0.01;lavash.position.y=lavashY;
});
loadModel('yellow_onion',0.42).then(m=>{
  if(!m)return;
  [[2.75,-1.0,0.4],[2.6,-0.45,2.1]].forEach(([x,z,r])=>{const o=m.clone();o.position.set(x,0,z);o.rotation.y=r;scene.add(o);});
});

let lidTarget=1,lidOpen=1,toastTick=0;
/* finished shawarma (cut-out photo) shown when an order is taken off the grill */
const served=new THREE.Sprite(new THREE.SpriteMaterial({map:texLoader.load('assets/textures/shawarma.png',t=>{t.colorSpace=THREE.SRGBColorSpace;}),transparent:true,depthTest:false}));
served.visible=false;served.renderOrder=10;scene.add(served);

/* Meshy sauce bottle (CC BY 4.0, Meshy). The one white model is tinted per sauce. */
gltf.load('assets/models/sauce-bottle.glb',d=>{
  const m=fitted(d.scene,0.62);
  const tint={garlic:null,spicy:'#e2442c',cheese:'#f2c13a'};
  for(const k in bottles){
    const b=bottles[k],c=m.clone(true);
    c.traverse(o=>{if(o.isMesh&&tint[k]){o.material=o.material.clone();o.material.color.set(tint[k]);}});
    b.add(c);b.userData.stub.forEach(s=>s.visible=false);
    const r=new THREE.Box3().setFromObject(c).getSize(new THREE.Vector3()).z/2;
    b.userData.label.position.set(0,0.42,r+0.02);b.userData.label.scale.setScalar(1.15);   /* label sits on the bottle's surface */
  }
});

/* ---------- size + loop ---------- */
let visible=false;
/* camera poses; the tabs fly between them */
const VIEWS={
  kitchen:{pos:new THREE.Vector3(0.6,6.4,10.6),look:new THREE.Vector3(0.6,1.0,-0.9),fov:38},
  hall:{pos:new THREE.Vector3(2.8,13,30),look:new THREE.Vector3(2.8,1.2,7.6),fov:44},
  /* portrait phones: steeper, closer, and allowed to crop the sides a little so the room fills the screen */
  hallTall:{pos:new THREE.Vector3(2.2,17.5,17.5),look:new THREE.Vector3(2.2,-1.5,5.6),fov:44,minAspect:0.85}
};
function pose(v){return v==='hall'&&camera.aspect<1?VIEWS.hallTall:VIEWS[v];}
let view='hall',camT=1,camFrom=null;
const camLook=VIEWS.hall.look.clone();
camera.position.copy(VIEWS.hall.pos);camera.lookAt(camLook);
/* keep the scene's width in frame: below 1.6:1 widen the vertical FOV so the horizontal view stays the same */
function fovFor(base,minAspect=0){
  const a=Math.max(camera.aspect,minAspect),half=Math.tan(THREE.MathUtils.degToRad(base/2));
  return a>=1.6?base:THREE.MathUtils.radToDeg(2*Math.atan(half*1.6/a));
}
function setView(v,instant){
  if(!VIEWS[v])return;
  camFrom={pos:camera.position.clone(),look:camLook.clone(),fov:camera.fov,view};
  view=v;camT=instant?1:0;
  hint.hidden=v!=='kitchen';
  if(v!=='kitchen')stopPour();
  if(window.Sfx)Sfx.loop('sizzle',v==='kitchen');
  if(instant)applyCam(1);
}
function applyCam(e){
  const V=pose(view);
  if(camFrom&&e<1){camera.position.lerpVectors(camFrom.pos,V.pos,e);camLook.lerpVectors(camFrom.look,V.look,e);camera.fov=THREE.MathUtils.lerp(camFrom.fov,fovFor(V.fov,V.minAspect),e);}
  else{camera.position.copy(V.pos);camLook.copy(V.look);camera.fov=fovFor(V.fov,V.minAspect);}
  camera.lookAt(camLook);camera.updateProjectionMatrix();
}
function resize(){
  const w=root.clientWidth,h=root.clientHeight;if(!w||!h)return;
  renderer.setSize(w,h,false);camera.aspect=w/h;applyCam(camT>=1?1:camT);
}
const hooks=[];
const cook={x:0.6};   /* where the cook in the aisle walks to: the last thing the player touched */
new ResizeObserver(resize).observe(root);

const clock=new THREE.Clock();
function frame(){
  requestAnimationFrame(frame);
  const dt=Math.min(clock.getDelta(),0.05),t=clock.elapsedTime;
  if(!visible)return;
  if(camT<1){camT=Math.min(1,camT+dt/0.8);const e=camT<0.5?2*camT*camT:1-Math.pow(-2*camT+2,2)/2;applyCam(e);}
  for(const h of hooks)h(dt,t);
  updateDrinks(dt);
  if(knife.visible)knife.position.lerp(knifeTarget,Math.min(1,dt*20));
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
  /* grill lid and toasting */
  lidOpen+=(lidTarget-lidOpen)*Math.min(1,dt*6);grillLid.rotation.x=-lidOpen*1.15;
  if(state.stage==='grill'){
    state.toast+=dt/5*perks.grill;toastColor(state.toast,rollMat.color);
    toastTick+=dt;if(toastTick>0.25){toastTick=0;changed();}
  }
  const grillTop=new THREE.Vector3(grill.position.x,0.8,grill.position.z+0.1);
  if(wrapAnim&&wrapAnim.mode==='roll'){
    /* roll the lavash on the board, then carry the roll over to the grill and close the lid */
    wrapAnim.t+=dt/1.5;const k=Math.min(wrapAnim.t,1);
    if(k<0.3){const q=k/0.3;lavash.scale.set(1,1+q*0.6,1-q*0.72);}
    else if(k<0.42){const q=(k-0.3)/0.12;lavash.scale.set(1-q,1.6*(1-q),0.28*(1-q));}
    else lavash.scale.set(0.001,0.001,0.001);
    if(k>=0.38){
      const q=Math.min(1,(k-0.38)/0.4);roll.visible=true;rollMat.color.set('#ffffff');
      roll.position.lerpVectors(lavash.position,grillTop,q);roll.position.y+=Math.sin(q*Math.PI)*1.4;
    }
    if(k>=0.78)lidTarget=0.22;   /* the lid rests on the roll, pressing it */
    if(k>=1){wrapAnim=null;state.stage='grill';state.toast=0;if(window.Sfx)Sfx.play('drop');changed();}
  }else if(wrapAnim&&wrapAnim.mode==='take'){
    /* lid up, the finished shawarma pops out of the grill */
    wrapAnim.t+=dt/1.3;const k=Math.min(wrapAnim.t,1);
    if(k>0.15){
      roll.visible=false;
      const q=(k-0.15)/0.85,pop=Math.min(1,q/0.25),bounce=pop<1?pop*(1.15-0.15*pop):1;
      served.visible=true;served.scale.set(0.95*bounce,2.5*bounce,1);
      toastColor(Math.min(state.toast,1.4)*0.6,served.material.color);
      served.position.set(grill.position.x,1.9*bounce+q*0.5,grill.position.z+0.4);
      served.material.opacity=q>0.8?1-(q-0.8)/0.2:1;
    }
    if(k>=1){const done=wrapAnim.done;wrapAnim=null;served.visible=false;served.material.color.set('#ffffff');reset();if(done)done();}
  }
  renderer.render(scene,camera);
}
frame();

window.Kitchen={
  /* the 3D view replaces the flat hall for good once it starts */
  start(){root.hidden=false;visible=true;resize();setView(view,true);},
  setView(v){setView(v);},
  get view(){return view;},
  get settled(){return camT>=1;},
  get progress(){return camT;},
  setOrder(o){order=o;updateHint();},
  setPerks(p){Object.assign(perks,p);},
  FILL_OK,FILL_MAX,
  reset,roll:rollUp,take:takeOff,toastLabel,TOAST_OK,TOAST_MAX,TOAST_BURNT,
  get state(){return Object.assign({},state,{ing:Object.assign({},state.ing)});},
  INGREDIENTS,
  MEAT_NEED
};
updateHint();hint.hidden=true;
export {THREE,scene,camera,renderer,root,hooks,gltf,texLoader,fitted,pbr,labelTex,canvasTex,mesh,M,PH,cook};
/* the hall module adds itself before the game is told the scene is ready */
import('./hall.js').catch(err=>console.error('hall',err)).finally(()=>document.dispatchEvent(new Event('kitchenready')));
