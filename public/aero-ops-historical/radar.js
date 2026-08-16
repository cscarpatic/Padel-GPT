import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';

const state={player:null,aircraft:[],targets:[],guns:[]};
const originalAdd=THREE.Object3D.prototype.add;
THREE.Object3D.prototype.add=function(...objects){
  const result=originalAdd.apply(this,objects);
  if(this && this.isScene){
    for(const o of objects){
      if(!o || !o.userData) continue;
      if(o.isGroup && o.userData.r===26 && typeof o.userData.hp==='number'){
        if(!state.player) state.player=o;
        else if(!state.aircraft.includes(o)) state.aircraft.push(o);
      }
      if(o.isGroup && o.userData.name && o.userData.type && typeof o.userData.pts==='number'){
        if(!state.targets.includes(o)) state.targets.push(o);
      }
      if(o.isGroup && typeof o.userData.cd==='number'){
        if(!state.guns.includes(o)) state.guns.push(o);
      }
    }
  }
  return result;
};

const canvas=document.getElementById('radarCanvas');
const ctx=canvas?.getContext('2d');
const rangeLabel=document.getElementById('radarRange');
let range=1800;

function resize(){
  if(!canvas) return;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const rect=canvas.getBoundingClientRect();
  canvas.width=Math.max(1,Math.round(rect.width*dpr));
  canvas.height=Math.max(1,Math.round(rect.height*dpr));
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize',resize,{passive:true});

function color(name){
  const css=getComputedStyle(document.documentElement);
  return css.getPropertyValue(name).trim();
}
function drawTriangle(x,y,size,fill,angle=0){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(0,-size);ctx.lineTo(size*.72,size);ctx.lineTo(-size*.72,size);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.restore();
}
function drawDiamond(x,y,size,fill){ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillStyle=fill;ctx.fillRect(-size/2,-size/2,size,size);ctx.restore()}
function drawCross(x,y,size,stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-size,y-size);ctx.lineTo(x+size,y+size);ctx.moveTo(x+size,y-size);ctx.lineTo(x-size,y+size);ctx.stroke()}
function plotObject(obj,kind,cx,cy,scale,inv){
  if(!obj || !obj.parent) return;
  if(obj.userData.dead) return;
  const rel=obj.position.clone().sub(state.player.position).applyQuaternion(inv);
  const dist=Math.hypot(rel.x,rel.z);
  if(dist>range) return;
  const x=cx+rel.x*scale,y=cy+rel.z*scale;
  if(kind==='enemy'){
    const f=new THREE.Vector3(0,0,-1).applyQuaternion(obj.quaternion).applyQuaternion(inv);
    drawTriangle(x,y,5,'#ff6262',Math.atan2(f.x,-f.z));
  }else if(kind==='gun'){
    drawCross(x,y,4,'#ffb35c');
  }else{
    const type=obj.userData.type;
    if(type==='ship'||type==='carrier'){
      ctx.strokeStyle='#63d8ff';ctx.lineWidth=2;ctx.beginPath();ctx.rect(x-5,y-3,10,6);ctx.stroke();
      if(type==='carrier'){ctx.beginPath();ctx.moveTo(x-7,y);ctx.lineTo(x+7,y);ctx.stroke()}
    }else drawDiamond(x,y,8,'#f6d365');
  }
}
function draw(){
  requestAnimationFrame(draw);
  if(!canvas||!ctx) return;
  const game=document.getElementById('game');
  if(game?.classList.contains('hidden')) return;
  if(canvas.width===0||canvas.height===0) resize();
  const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height,cx=w/2,cy=h/2;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle='rgba(3,14,22,.78)';ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='rgba(126,218,244,.28)';ctx.lineWidth=1;
  const radius=Math.min(w,h)*.46;
  for(const meters of[500,1000,1500]){const r=radius*(meters/range);ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke()}
  ctx.beginPath();ctx.moveTo(cx,cy-radius);ctx.lineTo(cx,cy+radius);ctx.moveTo(cx-radius,cy);ctx.lineTo(cx+radius,cy);ctx.stroke();
  ctx.fillStyle='rgba(225,246,255,.75)';ctx.font='9px system-ui';ctx.textAlign='center';ctx.fillText('N',cx,11);
  if(!state.player||!state.player.parent){
    ctx.fillStyle='rgba(220,240,248,.7)';ctx.font='11px system-ui';ctx.fillText('RADAR IN ATTESA',cx,cy);return;
  }
  const inv=state.player.quaternion.clone().invert();
  const scale=radius/range;
  state.targets.forEach(o=>plotObject(o,'target',cx,cy,scale,inv));
  state.guns.forEach(o=>plotObject(o,'gun',cx,cy,scale,inv));
  state.aircraft.forEach(o=>plotObject(o,'enemy',cx,cy,scale,inv));
  drawTriangle(cx,cy,7,'#8affce',0);
  ctx.strokeStyle='rgba(138,255,206,.65)';ctx.beginPath();ctx.moveTo(cx,cy-10);ctx.lineTo(cx,cy-22);ctx.stroke();
}

function clearCaptured(){state.player=null;state.aircraft.length=0;state.targets.length=0;state.guns.length=0}
document.getElementById('start')?.addEventListener('click',()=>setTimeout(clearCaptured,0),{capture:true});
document.getElementById('again')?.addEventListener('click',()=>setTimeout(clearCaptured,0),{capture:true});

document.getElementById('radarToggle')?.addEventListener('click',()=>{
  const panel=document.getElementById('radar');
  panel?.classList.toggle('compact');
});
document.getElementById('radarZoom')?.addEventListener('click',()=>{
  range=range===1800?3000:1800;
  if(rangeLabel) rangeLabel.textContent=range===1800?'1.8 km':'3 km';
});

resize();draw();
await import('./loader.js?v=3d3');
