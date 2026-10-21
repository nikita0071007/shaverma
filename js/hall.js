/* 3D hall in front of the open kitchen. Front to back: work counter (kitchen.js), the cook's aisle,
   the glass serving counter, then the dining room with tables, guests and couriers.
   Game logic still runs on the flat 640x400 hall coordinates in index.html (window.Game);
   this module maps those positions onto the 3D floor every frame. */
import {THREE,scene,camera,root,hooks,gltf,texLoader,fitted,pbr,mesh,M,PH,cook} from './kitchen.js';

const FLOOR_Y=-3;
const SX=0.0326,SZ=0.045;
const X=x=>(x-235)*SX,Z=y=>7.1+(y-100)*SZ;        /* flat hall -> 3D floor, starting past the glass counter */
const RIGHT_WALL=14.8,LEFT_WALL=-9.2,BACK=-3.38,FRONT=30;   /* deep and tall so the steep portrait camera never sees past the room */

const hall=new THREE.Group();scene.add(hall);
const crowd=new THREE.Group();hall.add(crowd);   /* tables and people: hidden while working in the kitchen view */

/* ---------- room ---------- */
const floorMat=new THREE.MeshStandardMaterial({color:'#d8d2c8',roughness:0.6});
pbr('large_floor_tiles_02',new THREE.Vector2(7,8),floorMat);
const floor=mesh(new THREE.PlaneGeometry(RIGHT_WALL-LEFT_WALL,FRONT-BACK),floorMat,false);
floor.rotation.x=-Math.PI/2;floor.position.set((RIGHT_WALL+LEFT_WALL)/2,FLOOR_Y,(FRONT+BACK)/2);hall.add(floor);

const brickMat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:0.9});
pbr('brick_wall_001',new THREE.Vector2(7,6),brickMat);brickMat.color.set('#f1e3d3');
const WALL_H=24,WALL_Y=FLOOR_Y+WALL_H/2;
function wall(w,h,x,y,z,ry){const m=mesh(new THREE.PlaneGeometry(w,h),brickMat,false);m.position.set(x,y,z);m.rotation.y=ry;hall.add(m);return m;}
wall(FRONT-BACK,WALL_H,LEFT_WALL,WALL_Y,(FRONT+BACK)/2,Math.PI/2);
const DOOR_Z=Z(348),DOOR_W=3.2;
wall(DOOR_Z-DOOR_W/2-BACK,WALL_H,RIGHT_WALL,WALL_Y,(BACK+DOOR_Z-DOOR_W/2)/2,-Math.PI/2);
wall(FRONT-(DOOR_Z+DOOR_W/2),WALL_H,RIGHT_WALL,WALL_Y,(FRONT+DOOR_Z+DOOR_W/2)/2,-Math.PI/2);
wall(DOOR_W,WALL_H-6.6,RIGHT_WALL,FLOOR_Y+6.6+(WALL_H-6.6)/2,DOOR_Z,-Math.PI/2);   /* above the 6.6-tall door */
wall(RIGHT_WALL-7.1,WALL_H,(RIGHT_WALL+7.1)/2,WALL_Y,BACK,0);         /* back wall beside the kitchen */
/* glass door with a steel frame, swings open when someone walks through */
const doorPivot=new THREE.Group();doorPivot.position.set(RIGHT_WALL-0.05,FLOOR_Y,DOOR_Z-DOOR_W/2);hall.add(doorPivot);
{
  const glassMat=new THREE.MeshPhysicalMaterial({color:'#cfe6ee',roughness:0.05,transparent:true,opacity:0.35,depthWrite:false});
  const pane=new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W,6.4),glassMat);pane.rotation.y=-Math.PI/2;pane.position.set(0,3.2,DOOR_W/2);doorPivot.add(pane);
  for(const [w,h,y,z] of [[0.15,6.6,3.3,0.07],[0.15,6.6,3.3,DOOR_W-0.07],[DOOR_W,0.18,6.5,DOOR_W/2],[DOOR_W,0.3,0.15,DOOR_W/2]]){
    const f=mesh(new THREE.BoxGeometry(0.12,h,w===0.15?0.15:w),M.darkSteel);f.position.set(0,y,z);doorPivot.add(f);
  }
  const handle=mesh(new THREE.BoxGeometry(0.1,1.4,0.08),M.steel);handle.position.set(-0.2,3.2,DOOR_W-0.4);doorPivot.add(handle);
  /* daylight behind the door */
  const out=new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W+0.4,6.8),new THREE.MeshBasicMaterial({color:'#fff3d6'}));
  out.rotation.y=-Math.PI/2;out.position.set(RIGHT_WALL+0.6,FLOOR_Y+3.4,DOOR_Z);hall.add(out);
}
let doorOpen=0;

/* one warm fill light for the hall (kept cheap for phones) */
{const l=new THREE.PointLight('#ffd9a0',40,30,1.4);l.position.set(3,8,9);hall.add(l);}

/* ---------- furniture ---------- */
const TABLES=[[150,150],[150,265],[290,150],[290,265],[430,150],[430,265]];
const tables=TABLES.map(([x,y])=>{
  const g=new THREE.Group();g.position.set(X(x),FLOOR_Y,Z(y));g.visible=false;crowd.add(g);
  /* stand-in until the Poly Haven table loads */
  const top=mesh(new THREE.CylinderGeometry(1.2,1.2,0.12,32),M.wood);top.position.y=2.3;g.add(top);
  const leg=mesh(new THREE.CylinderGeometry(0.12,0.3,2.3,12),M.darkSteel);leg.position.y=1.15;g.add(leg);
  g.userData.stub=[top,leg];
  return g;
});
const SEAT_DX=-1.75;   /* chair sits on the table's left side */
function loadPH(name,width,file=name){return new Promise(res=>gltf.load(PH+name+'/'+file+'.gltf',d=>res(fitted(d.scene,width)),undefined,()=>res(null)));}
loadPH('round_wooden_table_01',2.6).then(m=>{if(!m)return;for(const t of tables){t.userData.stub.forEach(s=>s.visible=false);t.add(m.clone());}});
loadPH('WoodenChair_01',1.25,'WoodenChair_01_lo').then(m=>{
  if(!m)return;
  for(const t of tables){const c=m.clone();c.position.set(SEAT_DX-0.15,0,0);c.rotation.y=Math.PI/2;t.add(c);}
});
loadPH('hanging_industrial_lamp',1.1).then(m=>{
  if(!m)return;
  for(const t of tables){const l=m.clone();l.position.set(0,11.2,0);t.add(l);}
});
loadPH('potted_plant_01',1.8,'potted_plant_01_lo').then(m=>{
  if(!m)return;
  for(const [x,z] of [[LEFT_WALL+1.2,FRONT-1.5],[RIGHT_WALL-1.3,2.2],[LEFT_WALL+1.2,3.2]]){const p=m.clone();p.position.set(x,FLOOR_Y,z);hall.add(p);}
});
loadPH('CashRegister_01',1.1).then(m=>{if(!m)return;m.position.set(3.9,0.12,5.55);m.rotation.y=Math.PI;scene.add(m);});

/* ---------- glass serving counter: guests look through it into the kitchen ---------- */
{
  const x0=-7.2,x1=5.0,z0=4.9,z1=6.3,w=x1-x0,d=z1-z0,cx=(x0+x1)/2,cz=(z0+z1)/2;
  const body=mesh(new THREE.BoxGeometry(w,3,d),M.wood,false);body.position.set(cx,-1.5,cz);scene.add(body);
  const kick=mesh(new THREE.BoxGeometry(w,0.25,d-0.2),M.darkSteel,false);kick.position.set(cx,-2.88,cz-0.1);scene.add(kick);
  const top=mesh(new THREE.BoxGeometry(w+0.1,0.12,d+0.25),M.steel);top.position.set(cx,0.06,cz+0.1);scene.add(top);
  const glass=new THREE.MeshPhysicalMaterial({color:'#e3f2f6',roughness:0.03,transparent:true,opacity:0.18,side:THREE.DoubleSide,depthWrite:false});
  const H=1.3,front=new THREE.Mesh(new THREE.PlaneGeometry(w-1.6,Math.hypot(H,0.5)),glass);
  front.position.set(cx-0.8,0.12+H/2,z1-0.25);front.rotation.x=-Math.atan2(0.5,H);scene.add(front);
  const lid=new THREE.Mesh(new THREE.PlaneGeometry(w-1.6,d-0.7),glass);lid.rotation.x=-Math.PI/2;lid.position.set(cx-0.8,0.12+H,z0+(d-0.7)/2+0.1);scene.add(lid);
  for(const x of [x0+0.05,x1-1.65]){const side=new THREE.Mesh(new THREE.PlaneGeometry(d-0.3,H),glass);side.rotation.y=Math.PI/2;side.position.set(x,0.12+H/2,cz);scene.add(side);}
  const rail=mesh(new THREE.BoxGeometry(w-1.6,0.06,0.06),M.steel);rail.position.set(cx-0.8,0.12+H,z1-0.5);scene.add(rail);
  /* trays of fresh food on display behind the glass */
  const fills=['#d4321f','#3f7a2a','#c9a2d8','#e8d39a','#8a3b22','#f0e6c8'];
  fills.forEach((c,i)=>{
    const tx=x0+0.9+i*1.65;
    const tray=mesh(new THREE.BoxGeometry(1.45,0.18,0.9),M.steel);tray.position.set(tx,0.21,cz-0.05);scene.add(tray);
    const f=mesh(new THREE.BoxGeometry(1.3,0.1,0.75),new THREE.MeshStandardMaterial({color:c,roughness:0.55}));f.position.set(tx,0.29,cz-0.05);scene.add(f);
  });
}

/* ---------- the cook is created after the people helpers below ---------- */
let cookG=null;
function makeCook(){
  const g=makeGuest({skin:'#E0AC83',shirt:'#f4f4f2',hair:'#2B1D14'});
  const white=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:0.6});
  const hatBand=mesh(new THREE.CylinderGeometry(0.46,0.46,0.3,20),white);hatBand.position.y=4.75;g.userData.body.add(hatBand);
  const puff=mesh(new THREE.SphereGeometry(0.58,18,12),white);puff.scale.y=0.7;puff.position.y=5.12;g.userData.body.add(puff);
  const apron=mesh(new THREE.BoxGeometry(0.95,1.9,0.05),new THREE.MeshStandardMaterial({color:'#3a2a20',roughness:0.8}));apron.position.set(0,2.4,0.37);g.userData.body.add(apron);
  g.position.set(0.6,FLOOR_Y,3.45);g.rotation.y=Math.PI;scene.add(g);
  return g;
}

/* ---------- people ---------- */
const PANTS=['#2d3142','#3b3b3b','#4a5a73','#5b4636','#2f4f4f'];
function mat(c){return new THREE.MeshStandardMaterial({color:c,roughness:0.75});}
function limb(r,len,m){const g=new THREE.Group(),c=mesh(new THREE.CapsuleGeometry(r,len,4,10),m);c.position.y=-len/2-r*0.5;g.add(c);return g;}
function makeGuest(c){
  const g=new THREE.Group(),skin=mat(c.skin),shirt=mat(c.shirt),pants=mat(PANTS[Math.floor(Math.random()*PANTS.length)]),hair=mat(c.hair);
  const body=new THREE.Group();g.add(body);
  const legL=limb(0.22,1.3,pants),legR=limb(0.22,1.3,pants);legL.position.set(-0.24,1.95,0);legR.position.set(0.24,1.95,0);body.add(legL,legR);
  const torso=mesh(new THREE.CapsuleGeometry(0.52,1.1,4,12),shirt);torso.scale.z=0.68;torso.position.y=2.95;body.add(torso);
  const armL=limb(0.16,1.15,shirt),armR=limb(0.16,1.15,shirt);armL.position.set(-0.68,3.65,0);armR.position.set(0.68,3.65,0);body.add(armL,armR);
  const head=mesh(new THREE.SphereGeometry(0.44,20,14),skin);head.position.y=4.4;body.add(head);
  const hairM=mesh(new THREE.SphereGeometry(0.47,20,10,0,Math.PI*2,0,Math.PI*0.55),hair);hairM.position.y=4.47;hairM.rotation.x=-0.25;body.add(hairM);
  const eyeM=mat('#1d140e');for(const x of [-0.15,0.15]){const e=mesh(new THREE.SphereGeometry(0.05,8,6),eyeM);e.position.set(x,4.45,0.4);body.add(e);}
  g.userData={legL,legR,armL,armR,body,phase:Math.random()*6};
  return g;
}
cookG=makeCook();

/* couriers use the Meshy model (white mesh, tinted courier-yellow) when it is available */
let courierModel=null;
const COURIER_C=(window.Game&&window.Game.COURIER_COLOR)||'#FF7A1A';
gltf.load('assets/models/courier.glb',d=>{
  courierModel=fitted(d.scene,1);
  const box=new THREE.Box3().setFromObject(courierModel),h=box.max.y-box.min.y;
  courierModel.scale.setScalar(5.3/h);
  courierModel.traverse(o=>{if(o.isMesh){o.geometry.computeVertexNormals();o.material=new THREE.MeshStandardMaterial({color:COURIER_C,roughness:0.6,side:THREE.DoubleSide});}});
});
const bagTex=(()=>{const c=document.createElement('canvas');c.width=256;c.height=256;const g=c.getContext('2d');
  g.fillStyle=COURIER_C;g.fillRect(0,0,256,256);g.fillStyle='#ffffff';g.font='800 50px Onest,Arial,sans-serif';g.textAlign='center';
  const parts=(window.Game&&window.Game.COURIER_BRAND||'Мчим Еда').split(' ');g.fillText(parts[0],128,118);if(parts[1])g.fillText(parts[1],128,176);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
function makeBag(){
  const g=new THREE.Group(),yellow=new THREE.MeshStandardMaterial({color:COURIER_C,roughness:0.7});
  const sides=[yellow,yellow,yellow,new THREE.MeshStandardMaterial({color:'#222'}),new THREE.MeshStandardMaterial({map:bagTex,roughness:0.7}),yellow];
  const box=mesh(new THREE.BoxGeometry(1.4,1.4,1.4),sides);box.position.y=0.7;g.add(box);
  const lid=new THREE.Group();lid.position.set(0,1.4,-0.7);g.add(lid);
  const l=mesh(new THREE.BoxGeometry(1.42,0.08,1.42),yellow);l.position.z=0.71;lid.add(l);
  g.userData.lid=lid;return g;
}
function makeCourier(c){
  const g=new THREE.Group();
  if(courierModel){const m=courierModel.clone(true);g.add(m);g.userData.body=m;}
  else{const s=makeGuest(Object.assign({},c,{shirt:COURIER_C}));g.add(s);Object.assign(g.userData,s.userData);}
  const cap=mesh(new THREE.CylinderGeometry(0.5,0.5,0.25,16),new THREE.MeshStandardMaterial({color:COURIER_C}));
  if(!courierModel){cap.position.y=4.75;g.add(cap);}
  const bag=makeBag();bag.position.set(1.3,0,0.4);g.add(bag);g.userData.bag=bag;
  return g;
}

/* ---------- bubbles & floating text (DOM, so they stay crisp) ---------- */
const layer=document.createElement('div');layer.className='bubbles';root.appendChild(layer);
const DRINK_C={tea:'#9A4A1C',ayran:'#F3EFE4',cola:'#2A0F06'},MEAT_C={chicken:'#E6B04F',beef:'#8A3B22'},SAUCE_C={garlic:'#FFF1CF',spicy:'#D8432B',cheese:'#F2C23B'};
function bubbleFor(c){
  const b=document.createElement('button');b.className='bub';b.type='button';
  const o=c.order;
  b.innerHTML='<span class="pt"><i></i></span><span class="ic">'+
    '<i class="dot" style="background:'+MEAT_C[o.meat]+'"></i>'+
    '<i class="sq" style="background:'+SAUCE_C[o.sauce]+'"></i>'+
    '<i class="ring'+(o.onion?'':' no')+'"></i>'+
    (o.drink?'<i class="cup" style="background:'+DRINK_C[o.drink]+'"></i>':'')+
    '</span>';
  b.setAttribute('aria-label',(c.courier?'Курьер':'Гость')+': открыть заказ');
  b.onclick=()=>{if(window.Game)window.Game.select(c);};
  layer.appendChild(b);return b;
}
const floats=new Map();

/* ---------- per-frame sync with the game ---------- */
const actors=new Map();
const v3=new THREE.Vector3();
function screen(x,y,z){
  v3.set(x,y,z).project(camera);
  return {x:(v3.x+1)/2*root.clientWidth,y:(1-v3.y)/2*root.clientHeight,on:v3.z<1};
}
const plates=new Map();
const wrapTex=texLoader.load('assets/textures/shawarma.png',t=>{t.colorSpace=THREE.SRGBColorSpace;});
hooks.push((dt,t)=>{
  const Game=window.Game;if(!Game)return;
  const G=Game.G,K=window.Kitchen,inHall=K&&K.view==='hall';
  layer.hidden=!inHall;
  /* in the kitchen view the player is the cook: hide the cook and the dining room so nothing blocks the counter */
  const working=K&&K.view==='kitchen'&&K.settled;
  crowd.visible=!working;cookG.visible=!working;
  {
    const u=cookG.userData,dx=cook.x-cookG.position.x,step=Math.sign(dx)*Math.min(Math.abs(dx),dt*5);
    cookG.position.x+=step;const walking=Math.abs(dx)>0.05;
    u.phase=(u.phase||0)+dt*(walking?9:2.5);
    const sw=walking?Math.sin(u.phase)*0.5:0;
    u.legL.rotation.x=sw;u.legR.rotation.x=-sw;
    u.armL.rotation.x=walking?-sw*0.8:-0.9+Math.sin(u.phase)*0.15;u.armR.rotation.x=walking?sw*0.8:-0.9-Math.sin(u.phase)*0.15;
    cookG.rotation.y=walking?(dx>0?Math.PI/2:-Math.PI/2):Math.PI;
  }
  tables.forEach((tb,i)=>{tb.visible=i<G.tables;});
  const seen=new Set();
  let nearDoor=false;
  for(const c of G.cust){
    seen.add(c);
    let a=actors.get(c);
    if(!a){a={g:c.courier?makeCourier(c):makeGuest(c),last:new THREE.Vector3(X(c.x),FLOOR_Y,Z(c.y)),bub:null};a.g.position.copy(a.last);crowd.add(a.g);actors.set(c,a);}
    const g=a.g,u=g.userData;
    const seated=!c.courier&&(c.state==='wait'||c.state==='eat');
    let px=X(c.x),pz=Z(c.y);
    if(seated){const tb=tables[c.table];px=tb.position.x+SEAT_DX;pz=tb.position.z;}
    const dx=px-a.last.x,dz=pz-a.last.z,moving=Math.hypot(dx,dz)>0.002;
    g.position.set(px,FLOOR_Y+(seated?-0.95:0),pz);
    if(moving)g.rotation.y=Math.atan2(dx,dz);
    else if(seated)g.rotation.y=Math.PI/2;
    else if(c.courier)g.rotation.y=-Math.PI/2+0.6;
    a.last.set(px,FLOOR_Y,pz);
    if(Math.abs(px-X(662))<2.5&&Math.abs(pz-DOOR_Z)<2.5)nearDoor=true;
    /* walk cycle / seated pose */
    u.phase=(u.phase||0)+dt*(moving?9:0);
    if(u.legL){
      const sw=moving?Math.sin(u.phase)*0.6:0;
      u.legL.rotation.x=seated?-1.45:sw;u.legR.rotation.x=seated?-1.45:-sw;
      u.armL.rotation.x=seated?-0.5:-sw*0.8;
      u.armR.rotation.x=c.state==='eat'?-1.2+Math.sin(t*4)*0.35:(seated?-0.5:sw*0.8);
      u.body.position.y=moving?Math.abs(Math.sin(u.phase))*0.08:0;
    }else if(u.body){u.body.position.y=moving?Math.abs(Math.sin(t*9))*0.12:0;u.body.rotation.z=moving?Math.sin(t*9)*0.04:0;}
    if(u.bag){
      const waiting=c.state==='wait'||c.state==='eat';
      u.bag.visible=waiting;
      if(waiting){const open=c.bagOpen||0;u.bag.userData.lid.rotation.x=-open*1.9;}
    }
    /* shawarma on the table while eating */
    if(c.state==='eat'&&!c.courier){
      if(!plates.has(c)){
        const s=new THREE.Sprite(new THREE.SpriteMaterial({map:wrapTex,transparent:true}));
        const tb=tables[c.table];s.position.set(tb.position.x-0.5,FLOOR_Y+3.15,tb.position.z);s.scale.set(0.38,1.0,1);crowd.add(s);plates.set(c,s);
      }
    }else if(plates.has(c)){crowd.remove(plates.get(c));plates.delete(c);}
    /* order bubble */
    if(c.state==='wait'){
      if(!a.bub)a.bub=bubbleFor(c);
      const p=screen(g.position.x,g.position.y+(seated?6.4:6.8),g.position.z);
      const hw=a.bub.offsetWidth/2+4,bx=Math.min(Math.max(p.x,hw),root.clientWidth-hw),by=Math.max(p.y,a.bub.offsetHeight+4);   /* keep bubbles on screen */
      a.bub.style.transform='translate('+(bx|0)+'px,'+(by|0)+'px) translate(-50%,-100%)';
      a.bub.classList.toggle('sel',G.sel===c);a.bub.classList.toggle('courier',!!c.courier);
      const r=c.patience/c.maxP;
      const bar=a.bub.firstChild.firstChild;bar.style.width=(r*100)+'%';bar.style.background=r>.5?'#8FB339':r>.25?'#F2A93B':'#D8432B';
    }else if(a.bub){a.bub.remove();a.bub=null;}
  }
  for(const [c,a] of actors)if(!seen.has(c)){crowd.remove(a.g);if(a.bub)a.bub.remove();actors.delete(c);if(plates.has(c)){crowd.remove(plates.get(c));plates.delete(c);}}
  /* door */
  doorOpen=THREE.MathUtils.clamp(doorOpen+(nearDoor?dt:-dt)*3,0,1);
  doorPivot.rotation.y=doorOpen*1.3;
  /* floating "+250 ₽" texts */
  const live=new Set();
  for(const f of G.floats){
    live.add(f);let el=floats.get(f);
    if(!el){el=document.createElement('div');el.className='flt';el.textContent=f.text;el.style.color=f.color;layer.appendChild(el);floats.set(f,el);}
    const p=screen(X(f.x),FLOOR_Y+6+f.t*1.5,Z(f.y+50));
    el.style.transform='translate('+(p.x|0)+'px,'+(p.y|0)+'px) translate(-50%,-100%)';el.style.opacity=Math.max(0,1.6-f.t);
  }
  for(const [f,el] of floats)if(!live.has(f)){el.remove();floats.delete(f);}
});
