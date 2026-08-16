import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { MatchScore } from './scoring.js';
import { computeSafeRallyVelocity } from './physics.js';
import { createAthlete } from './athlete.js';
import { DIFFICULTY, PLAYER_TUNING, joystickCurve } from './gameplay.js';
import { addSeasideArena, createGameplayGuides, updateGameplayGuides, computeGameplayCamera } from './presentation.js';
import './style.css';

const $ = (selector) => document.querySelector(selector);
const canvas = $('#game');
const boot = $('#boot');
const bootStatus = $('#bootStatus');
const menu = $('#menu');
const tutorial = $('#tutorial');
const pauseMenu = $('#pauseMenu');
const matchEnd = $('#matchEnd');
const unsupported = $('#unsupported');
const hud = $('#hud');
const tips = $('#tips');
const powerHud = $('#power');
const speedHud = $('#speed');
const touch = $('#touch');
const message = $('#message');
const statusEl = $('#status');
const playerScoreEl = $('#playerScore');
const aiScoreEl = $('#aiScore');
const gamesScoreEl = $('#gamesScore');
const setLabelEl = $('#setLabel');
const rallyCounter = $('#rallyCounter');
const difficultySelect = $('#difficulty');
const qualitySelect = $('#quality');
const soundButton = $('#soundButton');

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarsePointer = matchMedia('(pointer: coarse)').matches;
const score = new MatchScore();
const keys = new Set();
const clock = new THREE.Clock();
const COURT = { halfW: 5, halfL: 10, serviceLine: 6.95, netH: 0.88 };

const QUALITY = {
  low: { pixelRatio: 1, shadows: false, bloom: false, shadowSize: 512, spectators: 36 },
  medium: { pixelRatio: 1.35, shadows: true, bloom: true, shadowSize: 1024, spectators: 72 },
  high: { pixelRatio: 2, shadows: true, bloom: true, shadowSize: 2048, spectators: 132 }
};

function autoQuality() {
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  if (coarsePointer || cores <= 4 || memory <= 4) return 'medium';
  return 'high';
}

const difficultyVersion = localStorage.getItem('padelNovaDifficultyVersion');
let savedDifficulty = localStorage.getItem('padelNovaDifficulty');
if (difficultyVersion !== '3') {
  savedDifficulty = 'beginner';
  localStorage.setItem('padelNovaDifficulty', savedDifficulty);
  localStorage.setItem('padelNovaDifficultyVersion', '3');
}

let settings = {
  difficulty: DIFFICULTY[savedDifficulty] ? savedDifficulty : 'beginner',
  quality: localStorage.getItem('padelNovaQuality') || 'auto',
  sound: localStorage.getItem('padelNovaSound') !== 'off'
};
difficultySelect.value = DIFFICULTY[settings.difficulty] ? settings.difficulty : 'beginner';
qualitySelect.value = ['auto', 'low', 'medium', 'high'].includes(settings.quality) ? settings.quality : 'auto';

let renderer;
let scene;
let camera;
let composer;
let bloomPass;
let keyLight;
let appMode = 'boot';
let cameraMode = 0;
let menuOrbit = 0;
let pointLocked = false;
let rallyLive = false;
let serveReady = false;
let serveAnimation = null;
let serviceActive = false;
let serviceReceiver = 'ai';
let serviceTargetSign = -1;
let netTouchedOnServe = false;
let serveFaultCount = 0;
let serviceFenceFaultPending = false;
let firstServer = 'player';
let lastHitter = 'player';
let legalBounce = { player: false, ai: false };
let groundBounces = { player: 0, ai: 0 };
let shake = 0;
let power = 0.2;
let powerDir = 1;
let lastShotSpeed = 0;
let hitPressed = false;
let aiReactionTimer = 0;
let pointTimer = null;
let installPrompt = null;
let gamepadHitWasDown = false;
let gamepadPauseWasDown = false;
let gamepadCameraWasDown = false;
let touchVector = { x: 0, z: 0 };
let stats = { currentRally: 0, maxRally: 0, maxSpeed: 0 };
let gameplayGuides = null;
let hitBuffer = 0;

const player = { pos: new THREE.Vector3(0, 0, 7.8), vel: new THREE.Vector3(), speed: PLAYER_TUNING.speed, group: null, racket: null, swing: 0 };
const ai = { pos: new THREE.Vector3(0, 0, -7.8), vel: new THREE.Vector3(), speed: 5.25, group: null, racket: null, swing: 0 };
const ball = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), mesh: null, radius: 0.105, spin: new THREE.Vector3(), trail: [] };

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = settings.sound;
  }

  ensure() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    settings.sound = enabled;
    localStorage.setItem('padelNovaSound', enabled ? 'on' : 'off');
    updateSoundButton();
  }

  tone(type = 'hit', strength = 1) {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    osc.type = type === 'hit' ? 'triangle' : 'sine';
    const start = type === 'hit' ? 205 : type === 'glass' ? 118 : 82;
    const end = type === 'hit' ? 62 : 42;
    osc.frequency.setValueAtTime(start, now);
    osc.frequency.exponentialRampToValueAtTime(end, now + 0.085);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(type === 'hit' ? 1800 : 900, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.065 * strength, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    osc.start(now); osc.stop(now + 0.12);
  }
}
const sound = new SoundEngine();

function updateSoundButton() {
  soundButton.textContent = sound.enabled ? '♪' : '×';
  soundButton.classList.toggle('active', sound.enabled);
  soundButton.setAttribute('aria-label', sound.enabled ? 'Disattiva audio' : 'Attiva audio');
}
updateSoundButton();

function resolvedQuality() {
  return settings.quality === 'auto' ? autoQuality() : settings.quality;
}

function applyQuality() {
  if (!renderer) return;
  const q = QUALITY[resolvedQuality()];
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, q.pixelRatio));
  renderer.shadowMap.enabled = q.shadows;
  if (keyLight) {
    keyLight.castShadow = q.shadows;
    keyLight.shadow.mapSize.set(q.shadowSize, q.shadowSize);
    keyLight.shadow.needsUpdate = true;
  }
  if (bloomPass) bloomPass.enabled = q.bloom && !reducedMotion;
  resizeRenderer();
}

function mat(color, rough = 0.5, metal = 0, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...opts });
}

function makeCanvasTexture(draw, size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (renderer) texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function addCourt() {
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { top: { value: new THREE.Color(0x82d5ff) }, bottom: { value: new THREE.Color(0xeaf8ff) } },
    vertexShader: 'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 v;uniform vec3 top;uniform vec3 bottom;void main(){float h=normalize(v).y*.5+.5;gl_FragColor=vec4(mix(bottom,top,pow(h,1.45)),1.);}'
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(95, 32, 18), skyMaterial));

  const turf = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#1267ee'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 7000; i += 1) {
      const a = 0.04 + Math.random() * 0.13;
      ctx.fillStyle = `rgba(${22 + Math.random() * 18},${92 + Math.random() * 28},${225 + Math.random() * 30},${a})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1 + Math.random() * 2);
    }
    for (let y = 0; y < s; y += 64) {
      ctx.fillStyle = 'rgba(255,255,255,.048)'; ctx.fillRect(0, y, s, 32);
    }
  }, 1024);
  turf.wrapS = turf.wrapT = THREE.RepeatWrapping; turf.repeat.set(2, 4);

  const arenaGround = new THREE.Mesh(new THREE.CircleGeometry(58, 64), mat(0xd7ecf8, 1));
  arenaGround.rotation.x = -Math.PI / 2; arenaGround.position.y = -0.38; arenaGround.receiveShadow = true; scene.add(arenaGround);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.28, 22.7), mat(0xf4f9fc, 0.72, 0.03));
  slab.position.y = -0.2; slab.receiveShadow = true; scene.add(slab);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 20), new THREE.MeshStandardMaterial({ map: turf, roughness: 0.72 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const line = (w, l, x, z) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, l), lineMat);
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, 0.008, z); scene.add(mesh);
  };
  line(0.05, 20, -4.975, 0); line(0.05, 20, 4.975, 0);
  line(10, 0.05, 0, -9.975); line(10, 0.05, 0, 9.975);
  line(10, 0.05, 0, COURT.serviceLine); line(10, 0.05, 0, -COURT.serviceLine);
  line(0.05, COURT.serviceLine + 0.2, 0, (COURT.serviceLine + 0.2) / 2);
  line(0.05, COURT.serviceLine + 0.2, 0, -(COURT.serviceLine + 0.2) / 2);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xc9efff, transparent: true, opacity: 0.18, roughness: 0.07, transmission: 0.82,
    thickness: 0.08, side: THREE.DoubleSide, metalness: 0
  });
  const fenceTex = makeCanvasTexture((ctx, s) => {
    ctx.clearRect(0, 0, s, s); ctx.strokeStyle = 'rgba(61,104,186,.38)'; ctx.lineWidth = 2;
    for (let i = 0; i <= s; i += 26) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke();
    }
  });
  fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping; fenceTex.repeat.set(2, 1);
  const fenceMat = new THREE.MeshStandardMaterial({ map: fenceTex, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide, color: 0x4775cb, roughness: 0.75, metalness: 0.35 });
  const panel = (w, h, x, y, z, ry, material) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    mesh.position.set(x, y, z); mesh.rotation.y = ry; mesh.receiveShadow = true; scene.add(mesh); return mesh;
  };
  panel(10, 3, 0, 1.5, -10, 0, glassMat); panel(10, 3, 0, 1.5, 10, 0, glassMat);
  panel(10, 1, 0, 3.5, -10, 0, fenceMat); panel(10, 1, 0, 3.5, 10, 0, fenceMat);
  for (const x of [-5, 5]) {
    panel(4, 3, x, 1.5, -8, Math.PI / 2, glassMat);
    panel(4, 3, x, 1.5, 8, Math.PI / 2, glassMat);
    panel(12, 3, x, 1.5, 0, Math.PI / 2, fenceMat);
    panel(20, 1, x, 3.5, 0, Math.PI / 2, fenceMat);
  }

  const frameMat = mat(0x2464d7, 0.22, 0.56);
  const beam = (sx, sy, sz, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), frameMat);
    mesh.position.set(x, y, z); mesh.castShadow = true; scene.add(mesh); return mesh;
  };
  [-5, 5].forEach((x) => [-10, 10].forEach((z) => beam(0.09, 4.1, 0.09, x, 2, z)));
  for (let z = -10; z <= 10.01; z += 2) { beam(0.055, 4, 0.055, -5, 2, z); beam(0.055, 4, 0.055, 5, 2, z); }
  for (let x = -5; x <= 5.01; x += 2.5) { beam(0.055, 4, 0.055, x, 2, -10); beam(0.055, 4, 0.055, x, 2, 10); }
  beam(10.1, 0.07, 0.07, 0, 4, -10); beam(10.1, 0.07, 0.07, 0, 4, 10);
  beam(0.07, 0.07, 20.1, -5, 4, 0); beam(0.07, 0.07, 20.1, 5, 4, 0);

  const netTex = makeCanvasTexture((ctx, s) => {
    ctx.clearRect(0, 0, s, s); ctx.strokeStyle = 'rgba(229,240,240,.72)'; ctx.lineWidth = 2;
    for (let i = 0; i <= s; i += 22) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke();
    }
  });
  const net = new THREE.Mesh(new THREE.PlaneGeometry(10, COURT.netH), new THREE.MeshStandardMaterial({ map: netTex, alphaTest: 0.12, transparent: true, side: THREE.DoubleSide, color: 0xc7d0d1, roughness: 0.88 }));
  net.position.set(0, COURT.netH / 2, 0); net.castShadow = true; scene.add(net);
  beam(0.1, 1.05, 0.1, -5, 0.52, 0); beam(0.1, 1.05, 0.1, 5, 0.52, 0); beam(10.1, 0.05, 0.05, 0, 0.91, 0);

  const standMatA = mat(0x1759dd, 0.52, 0.08); const standMatB = mat(0xf1f7fb, 0.78, 0.02);
  for (const side of [-1, 1]) {
    for (let row = 0; row < 7; row += 1) {
      const z = side * (12.7 + row * 0.75); const h = 0.25 + row * 0.36;
      const stand = new THREE.Mesh(new THREE.BoxGeometry(15, 0.34, 1), row % 2 ? standMatA : standMatB);
      stand.position.set(0, h, z); stand.receiveShadow = true; scene.add(stand);
    }
  }

  const spectatorCount = QUALITY[resolvedQuality()].spectators;
  const spectatorGeometry = new THREE.SphereGeometry(0.12, 7, 5);
  const spectatorMaterial = mat(0xbac8d2, 0.88);
  const spectators = new THREE.InstancedMesh(spectatorGeometry, spectatorMaterial, spectatorCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < spectatorCount; i += 1) {
    const side = i % 2 ? 1 : -1;
    const row = Math.floor(Math.random() * 7);
    dummy.position.set((Math.random() - 0.5) * 12.5, 0.58 + row * 0.36, side * (12.55 + row * 0.75));
    dummy.scale.setScalar(0.8 + Math.random() * 0.45); dummy.updateMatrix(); spectators.setMatrixAt(i, dummy.matrix);
  }
  scene.add(spectators);

  scene.add(new THREE.HemisphereLight(0xdaf5ff, 0xd5e6ef, 1.78));
  keyLight = new THREE.DirectionalLight(0xffffff, 2.85); keyLight.position.set(-8, 16, 7); keyLight.castShadow = true;
  keyLight.shadow.camera.left = -14; keyLight.shadow.camera.right = 14; keyLight.shadow.camera.top = 18; keyLight.shadow.camera.bottom = -18;
  scene.add(keyLight);
  [[-8, 8, -13], [8, 8, -13], [-8, 8, 13], [8, 8, 13]].forEach(([x, y, z], index) => {
    const spot = new THREE.SpotLight(index < 2 ? 0xbfeaff : 0xffffff, 78, 38, Math.PI / 5, 0.45, 1.1);
    spot.position.set(x, y, z); spot.target.position.set(0, 0, 0); spot.castShadow = index === 0; scene.add(spot, spot.target);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(2, 0.15, 0.5), new THREE.MeshBasicMaterial({ color: 0xf8fdff, toneMapped: false }));
    lamp.position.set(x, y, z); lamp.lookAt(0, 0, 0); scene.add(lamp);
  });
}

function makePlayer(color, isAI = false) {
  return createAthlete({ THREE, scene, mat, color, isAI });
}

function makeBall() {
  const texture = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#d7f45d'; ctx.fillRect(0, 0, s, s); ctx.strokeStyle = '#eef8c1'; ctx.lineWidth = 20;
    ctx.beginPath(); ctx.arc(s * 0.2, s * 0.5, s * 0.46, -1.2, 1.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(s * 0.8, s * 0.5, s * 0.46, 1.94, 4.34); ctx.stroke();
  });
  ball.mesh = new THREE.Mesh(new THREE.SphereGeometry(ball.radius, 26, 20), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.56, emissive: 0x314500, emissiveIntensity: 0.14 }));
  ball.mesh.castShadow = true; ball.mesh.scale.setScalar(1.12); scene.add(ball.mesh);
  const trailMat = new THREE.MeshBasicMaterial({ color: 0xeaff76, transparent: true, opacity: 0.36, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 12; i += 1) {
    const scale = Math.max(0.24, 0.92 - i * 0.055);
    const t = new THREE.Mesh(new THREE.SphereGeometry(ball.radius * scale, 12, 9), trailMat.clone());
    t.material.opacity = Math.max(0.025, 0.36 - i * 0.024); scene.add(t); ball.trail.push(t);
  }
}

function initRenderer() {
  try {
    scene = new THREE.Scene(); scene.fog = null;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
  } catch (error) {
    console.error(error); boot.classList.add('hidden'); unsupported.classList.remove('hidden'); return false;
  }
  renderer.setSize(innerWidth, innerHeight); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.94;
  camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 180); camera.position.set(5.5, 8.2, 16.5);
  composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.14, 0.28, 0.94); composer.addPass(bloomPass); composer.addPass(new OutputPass());
  applyQuality(); return true;
}

function setUIPlaying(active) {
  hud.classList.toggle('hidden', !active); tips.classList.toggle('hidden', !active); powerHud.classList.toggle('hidden', !active); speedHud.classList.toggle('hidden', !active);
  touch.classList.toggle('hidden', !active || !coarsePointer); document.body.classList.toggle('playing', active);
}

function showMenu() {
  appMode = 'menu'; clearTimeout(pointTimer); pointLocked = false; rallyLive = false; serveReady = false; serveAnimation = null;
  menu.classList.remove('hidden'); pauseMenu.classList.add('hidden'); matchEnd.classList.add('hidden'); tutorial.classList.add('hidden'); setUIPlaying(false);
  statusEl.textContent = 'SERVIZIO'; keys.clear(); touchVector.x = touchVector.z = 0;
}

function startMatch() {
  sound.ensure();
  settings.difficulty = difficultySelect.value; settings.quality = qualitySelect.value;
  localStorage.setItem('padelNovaDifficulty', settings.difficulty); localStorage.setItem('padelNovaQuality', settings.quality);
  applyQuality(); score.reset(); stats = { currentRally: 0, maxRally: 0, maxSpeed: 0 }; firstServer = 'player';
  appMode = 'playing'; menu.classList.add('hidden'); pauseMenu.classList.add('hidden'); matchEnd.classList.add('hidden'); tutorial.classList.add('hidden'); setUIPlaying(true);
  updateScoreUI(); resetBall(getServer());
}

function pauseGame(force = null) {
  if (appMode !== 'playing' && appMode !== 'paused') return;
  const shouldPause = force ?? appMode === 'playing';
  appMode = shouldPause ? 'paused' : 'playing'; pauseMenu.classList.toggle('hidden', !shouldPause);
  keys.clear(); touchVector.x = touchVector.z = 0; clock.getDelta();
}

function restartMatch() { clearTimeout(pointTimer); startMatch(); }

function endMatchUI() {
  appMode = 'ended'; setUIPlaying(false); matchEnd.classList.remove('hidden');
  const d = score.display(); $('#matchEndTitle').textContent = d.winner === 'player' ? 'VITTORIA' : 'SCONFITTA';
  $('#finalScore').textContent = `${d.playerGames} — ${d.aiGames}`; $('#statRally').textContent = stats.maxRally; $('#statSpeed').textContent = Math.round(stats.maxSpeed); $('#statPoints').textContent = score.totalPoints;
}

function getServer() {
  if (!score.tieBreak) return score.gameNumber % 2 === 0 ? firstServer : opposite(firstServer);
  const played = score.points.player + score.points.ai;
  const base = score.gameNumber % 2 === 0 ? firstServer : opposite(firstServer);
  if (played === 0) return base;
  const group = Math.floor((played - 1) / 2);
  return group % 2 === 0 ? opposite(base) : base;
}

function serviceSideSign() {
  const played = score.points.player + score.points.ai;
  return played % 2 === 0 ? 1 : -1;
}

function resetBall(server, preserveFault = false) {
  if (score.finished) return;
  rallyLive = false; serveReady = true; serveAnimation = null; serviceActive = false; netTouchedOnServe = false; serviceFenceFaultPending = false;
  if (!preserveFault) serveFaultCount = 0;
  groundBounces.player = groundBounces.ai = 0; legalBounce.player = legalBounce.ai = false; ball.vel.set(0, 0, 0); ball.spin.set(0, 0, 0);
  stats.currentRally = 0; updateRallyUI();
  const sign = serviceSideSign();
  if (server === 'player') {
    player.pos.set(sign * 2.15, 0, 7.55); ai.pos.set(-sign * 1.6, 0, -5.9); ball.pos.set(player.pos.x - 0.4, 1.02, player.pos.z - 0.05);
  } else {
    ai.pos.set(sign * 2.15, 0, -7.55); player.pos.set(-sign * 1.6, 0, 5.9); ball.pos.set(ai.pos.x + 0.4, 1.02, ai.pos.z + 0.05);
  }
  player.group.position.copy(player.pos); ai.group.position.copy(ai.pos); ball.mesh.position.copy(ball.pos);
  statusEl.textContent = server === 'player' ? 'SPAZIO PER SERVIRE' : `SERVIZIO CPU · ${DIFFICULTY[settings.difficulty].label}`;
  if (server === 'ai') pointTimer = setTimeout(() => { if (appMode === 'playing' && serveReady) beginServe('ai'); }, 850);
}

function beginServe(server) {
  if (!serveReady || pointLocked || appMode !== 'playing') return;
  serveReady = false; serviceActive = true; serviceReceiver = opposite(server); netTouchedOnServe = false; serviceFenceFaultPending = false; serviceTargetSign = -serviceSideSign();
  serveAnimation = { server, t: 0, bounced: false, struck: false };
  statusEl.textContent = 'RIMBALZO DI SERVIZIO';
  if (server === 'player') player.swing = 0.18; else ai.swing = 0.18;
}

function updateServeAnimation(dt) {
  if (!serveAnimation) return;
  const s = serveAnimation; s.t += dt; const serverObj = s.server === 'player' ? player : ai; const zOffset = s.server === 'player' ? -0.05 : 0.05; const xOffset = s.server === 'player' ? -0.4 : 0.4;
  ball.pos.x = serverObj.pos.x + xOffset; ball.pos.z = serverObj.pos.z + zOffset;
  if (s.t < 0.24) {
    const k = s.t / 0.24; ball.pos.y = THREE.MathUtils.lerp(1.02, ball.radius, k * k);
  } else if (s.t < 0.46) {
    if (!s.bounced) { s.bounced = true; sound.tone('bounce', 0.5); }
    const k = (s.t - 0.24) / 0.22; ball.pos.y = THREE.MathUtils.lerp(ball.radius, 0.72, Math.sin(k * Math.PI / 2));
  } else if (!s.struck) {
    s.struck = true; const target = new THREE.Vector3(serviceTargetSign * 2.2, ball.radius, s.server === 'player' ? -4.65 : 4.65);
    launchBallistic(target, 0.78, s.server, 4.5); serveAnimation = null; rallyLive = true; lastHitter = s.server; stats.currentRally = 1; updateRallyUI();
    if (s.server === 'player') player.swing = 1; else ai.swing = 1; shake = reducedMotion ? 0 : 0.08; sound.tone('hit', 0.9); statusEl.textContent = 'SERVIZIO IN GIOCO';
  }
  ball.mesh.position.copy(ball.pos);
}

function launchBallistic(target, flightTime, hitter, spinY = 7) {
  const gravity = 9.81;
  const dx = target.x - ball.pos.x; const dz = target.z - ball.pos.z; const dy = target.y - ball.pos.y;
  ball.vel.set(dx / flightTime, (dy + 0.5 * gravity * flightTime * flightTime) / flightTime, dz / flightTime);
  ball.spin.set((Math.random() - 0.5) * 3.5, spinY * (hitter === 'player' ? 1 : -1), -ball.vel.x * 0.55);
  recordShotSpeed();
}

function launchTowards(target, horizontalSpeed, lift, hitter) {
  const { velocity } = computeSafeRallyVelocity({
    start: ball.pos,
    target,
    horizontalSpeed,
    liftHint: lift,
    netHeight: COURT.netH,
    ballRadius: ball.radius
  });
  ball.vel.set(velocity.x, velocity.y, velocity.z);
  ball.spin.set((Math.random() - 0.5) * 3.2, 3.5 * (hitter === 'player' ? 1 : -1), -ball.vel.x * 0.42);
  recordShotSpeed();
}

function recordShotSpeed() {
  lastShotSpeed = ball.vel.length() * 3.6; stats.maxSpeed = Math.max(stats.maxSpeed, lastShotSpeed); $('#speed span').textContent = String(Math.round(lastShotSpeed));
}

function prepareAfterHit(hitter) {
  serviceFenceFaultPending = false;
  lastHitter = hitter; const receiver = opposite(hitter); legalBounce[receiver] = false; groundBounces[receiver] = 0; stats.currentRally += 1; stats.maxRally = Math.max(stats.maxRally, stats.currentRally); updateRallyUI();
}

function playerHit() {
  if (appMode !== 'playing' || pointLocked) return false;
  if (serveReady && getServer() === 'player') { beginServe('player'); return true; }
  if (!rallyLive || serviceActive && serviceReceiver === 'player') return false;
  const distance = horizontalBallDistance(player);
  if (ball.pos.z > 0 && distance < PLAYER_TUNING.hitReach && ball.pos.y < PLAYER_TUNING.maxHitHeight) {
    const xIntent = getMoveX(); const zIntent = getMoveZ(); const smash = ball.pos.y > 1.55 ? 1 : 0; const lob = zIntent > 0.45 ? 1 : 0;
    const targetX = THREE.MathUtils.clamp(ball.pos.x + xIntent * 3.2, -4.25, 4.25); const targetZ = lob ? -8.2 : -7.4;
    launchTowards(new THREE.Vector3(targetX, ball.radius, targetZ), 10.2 + power * 5.2 + smash * 2.7 - lob * 1.2, 2.4 + power * 1.8 + smash * 1.0 + lob * 2.5, 'player');
    prepareAfterHit('player'); player.swing = 1; shake = reducedMotion ? 0 : 0.14; sound.tone('hit', 1.12); statusEl.textContent = smash ? 'SMASH' : lob ? 'LOB' : 'RALLY';
    navigator.vibrate?.(18);
    return true;
  }
  return false;
}

function aiHit() {
  if (!rallyLive || pointLocked || serviceActive && serviceReceiver === 'ai') return;
  const level = DIFFICULTY[settings.difficulty];
  const aggressive = ball.pos.y > 1.5 ? 1 : 0;
  const targetX = THREE.MathUtils.clamp(
    player.pos.x * 0.18 + (Math.random() - 0.5) * level.accuracy * 1.6,
    -3.25,
    3.25
  );
  const targetZ = 6.3 + Math.random() * 1.2;
  const speed = (7.6 + Math.random() * 1.0 + aggressive * 0.55) * level.power;
  const lift = 3.7 + Math.random() * 1.0 + aggressive * 0.3;
  launchTowards(new THREE.Vector3(targetX, ball.radius, targetZ), speed, lift, 'ai');
  prepareAfterHit('ai'); ai.swing = 1; shake = reducedMotion ? 0 : 0.055; sound.tone('hit', 0.78);
}

function getMoveX() {
  return THREE.MathUtils.clamp((keys.has('KeyA') || keys.has('ArrowLeft') ? -1 : 0) + (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) + touchVector.x + gamepadAxes().x, -1, 1);
}
function getMoveZ() {
  return THREE.MathUtils.clamp((keys.has('KeyW') || keys.has('ArrowUp') ? -1 : 0) + (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) + touchVector.z + gamepadAxes().z, -1, 1);
}
function gamepadAxes() {
  const gp = navigator.getGamepads?.()[0]; if (!gp) return { x: 0, z: 0 };
  const dead = (v) => Math.abs(v) < 0.14 ? 0 : v; return { x: dead(gp.axes[0] || 0), z: dead(gp.axes[1] || 0) };
}

function clampActor(actor, side) {
  actor.pos.x = THREE.MathUtils.clamp(actor.pos.x, -4.55, 4.55);
  actor.pos.z = side === 'player' ? THREE.MathUtils.clamp(actor.pos.z, 0.55, 9.35) : THREE.MathUtils.clamp(actor.pos.z, -9.35, -0.55);
}

function animateActor(actor, dt, isAI) {
  actor.group.position.lerp(actor.pos, 1 - Math.exp(-16 * dt));
  const speedFactor = Math.min(1, actor.vel.length() / 5.2);
  const gait = Math.sin(performance.now() * 0.0145) * speedFactor;
  const lateral = THREE.MathUtils.clamp(actor.vel.x / 9, -1, 1);
  const forward = THREE.MathUtils.clamp(actor.vel.z / 9, -1, 1);
  actor.group.position.y = Math.abs(gait) * 0.032;

  const bodyRoot = actor.group.userData.bodyRoot;
  if (bodyRoot) {
    bodyRoot.rotation.z = THREE.MathUtils.lerp(bodyRoot.rotation.z, -lateral * 0.07, 0.16);
    bodyRoot.rotation.x = THREE.MathUtils.lerp(bodyRoot.rotation.x, forward * 0.045, 0.16);
  }

  const head = actor.group.userData.head;
  if (head) head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, lateral * 0.035, 0.14);

  const legs = actor.group.userData.legs;
  if (legs) {
    legs[0].rotation.x = gait * 0.5;
    legs[1].rotation.x = -gait * 0.5;
  }
  const anchors = actor.group.userData.legAnchors;
  if (anchors) {
    anchors[0].lower.rotation.x = Math.max(0, -gait) * 0.42;
    anchors[1].lower.rotation.x = Math.max(0, gait) * 0.42;
    anchors[0].shoe.rotation.x = Math.max(0, -gait) * 0.2;
    anchors[1].shoe.rotation.x = Math.max(0, gait) * 0.2;
  }

  const arms = actor.group.userData.arms;
  const forearms = actor.group.userData.forearms;
  const armBaseZ = actor.group.userData.armBaseZ;
  if (arms && armBaseZ) {
    arms[0].rotation.x = -gait * 0.28;
    arms[0].rotation.z = THREE.MathUtils.lerp(arms[0].rotation.z, armBaseZ[0], 0.18);
  }
  if (forearms) forearms[0].rotation.x = Math.max(0, gait) * 0.18;

  if (actor.swing > 0) {
    actor.swing = Math.max(0, actor.swing - dt * 5.1);
    const s = Math.sin((1 - actor.swing) * Math.PI);
    actor.racket.rotation.z = (isAI ? 1 : -1) * s * 1.22;
    actor.racket.rotation.y = s * 0.48;
    actor.racket.rotation.x = -s * 0.18;
    if (arms && armBaseZ) {
      arms[1].rotation.x = -1.02 * s;
      arms[1].rotation.z = armBaseZ[1] - 0.38 * s;
    }
    if (forearms) forearms[1].rotation.x = -0.72 * s;
    if (bodyRoot) bodyRoot.rotation.y = (isAI ? -1 : 1) * s * 0.16;
  } else {
    actor.racket.rotation.z = THREE.MathUtils.lerp(actor.racket.rotation.z, 0, 0.2);
    actor.racket.rotation.y = THREE.MathUtils.lerp(actor.racket.rotation.y, 0, 0.2);
    actor.racket.rotation.x = THREE.MathUtils.lerp(actor.racket.rotation.x, 0, 0.2);
    if (arms && armBaseZ) {
      arms[1].rotation.x = THREE.MathUtils.lerp(arms[1].rotation.x, gait * 0.2, 0.18);
      arms[1].rotation.z = THREE.MathUtils.lerp(arms[1].rotation.z, armBaseZ[1], 0.18);
    }
    if (forearms) forearms[1].rotation.x = THREE.MathUtils.lerp(forearms[1].rotation.x, 0.08, 0.18);
    if (bodyRoot) bodyRoot.rotation.y = THREE.MathUtils.lerp(bodyRoot.rotation.y, 0, 0.16);
  }
}

function updatePlayer(dt) {
  let mx = getMoveX(), mz = getMoveZ();
  const inputLength = Math.hypot(mx, mz);
  if (inputLength > 1) { mx /= inputLength; mz /= inputLength; }

  const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const mobileBoost = coarsePointer ? PLAYER_TUNING.touchBoost : 1;
  const desired = new THREE.Vector3(mx, 0, mz).multiplyScalar(
    player.speed * mobileBoost * (sprint ? PLAYER_TUNING.sprintBoost : 1)
  );

  const level = DIFFICULTY[settings.difficulty];
  if (rallyLive && ball.pos.z > 0 && level.assist > 0) {
    const leadTime = 0.18;
    const predicted = new THREE.Vector3(
      THREE.MathUtils.clamp(ball.pos.x + ball.vel.x * leadTime, -4.25, 4.25),
      0,
      THREE.MathUtils.clamp(ball.pos.z + ball.vel.z * leadTime, 0.9, 8.95)
    );
    const assist = predicted.sub(player.pos);
    const assistDistance = assist.length();
    if (assistDistance > 0.18 && assistDistance < PLAYER_TUNING.assistRange) {
      const idleMultiplier = inputLength < 0.12 ? 0.84 : 0.46;
      assist.normalize().multiplyScalar(player.speed * mobileBoost * level.assist * idleMultiplier);
      desired.add(assist);
    }
  }

  desired.clampLength(0, player.speed * mobileBoost * 1.12);
  player.vel.lerp(desired, 1 - Math.exp(-PLAYER_TUNING.acceleration * dt));
  player.pos.addScaledVector(player.vel, dt);
  clampActor(player, 'player');
  const facing = Math.atan2(ball.pos.x - player.pos.x, ball.pos.z - player.pos.z);
  player.group.rotation.y = THREE.MathUtils.lerp(player.group.rotation.y, facing, 0.2);
  animateActor(player, dt, false);
}

function updateAI(dt) {
  const level = DIFFICULTY[settings.difficulty];
  ai.speed = level.speed;
  aiReactionTimer -= dt;
  let targetX = THREE.MathUtils.clamp(ball.pos.x * 0.72, -3.5, 3.5);
  let targetZ = -6.8;
  if (rallyLive && ball.pos.z < 0) {
    const lookAhead = ball.vel.z < 0 ? 0.14 : 0.06;
    const predictedX = ball.pos.x + ball.vel.x * lookAhead;
    const predictedZ = ball.pos.z + ball.vel.z * lookAhead;
    targetZ = THREE.MathUtils.clamp(predictedZ - 0.48, -8.6, -1.7);
    targetX = THREE.MathUtils.clamp(predictedX, -3.95, 3.95);
  }
  const to = new THREE.Vector3(targetX - ai.pos.x, 0, targetZ - ai.pos.z);
  if (to.length() > 0.08) to.normalize().multiplyScalar(ai.speed);
  ai.vel.lerp(to, 1 - Math.exp(-7 * dt));
  ai.pos.addScaledVector(ai.vel, dt);
  clampActor(ai, 'ai');
  ai.group.rotation.y = THREE.MathUtils.lerp(ai.group.rotation.y, Math.atan2(ball.pos.x - ai.pos.x, ball.pos.z - ai.pos.z), 0.14);
  animateActor(ai, dt, true);
  const canReturn = !(serviceActive && serviceReceiver === 'ai');
  if (rallyLive && ball.pos.z < 0 && horizontalBallDistance(ai) < level.aiReach && ball.pos.y < 2.95 && canReturn && aiReactionTimer <= 0) {
    aiReactionTimer = level.reaction;
    aiHit();
  }
}

function horizontalBallDistance(actor) {
  const dx = ball.pos.x - actor.pos.x; const dz = ball.pos.z - actor.pos.z; return Math.hypot(dx, dz);
}

function sideOf(z) { return z >= 0 ? 'player' : 'ai'; }
function opposite(side) { return side === 'player' ? 'ai' : 'player'; }

function validServiceBounce() {
  const correctHalf = sideOf(ball.pos.z) === serviceReceiver;
  const insideDepth = Math.abs(ball.pos.z) <= COURT.serviceLine + 0.03 && Math.abs(ball.pos.z) > 0.05;
  const correctDiagonal = Math.sign(ball.pos.x || serviceTargetSign) === Math.sign(serviceTargetSign);
  return correctHalf && insideDepth && correctDiagonal && Math.abs(ball.pos.x) <= COURT.halfW;
}

function serviceFault(reason = 'FALLO DI SERVIZIO') {
  serviceActive = false; rallyLive = false; pointLocked = true; serveFaultCount += 1;
  if (serveFaultCount >= 2) {
    pointLocked = false;
    pointTo(serviceReceiver, 'DOPPIO FALLO');
    return;
  }
  showMessage('FALLO · SECONDA'); statusEl.textContent = `${reason} · SECONDA PALLA`;
  pointTimer = setTimeout(() => { pointLocked = false; resetBall(getServer(), true); }, 850);
}

function updateBall(dt) {
  if (serveAnimation) { updateServeAnimation(dt); return; }
  if (serveReady) {
    const server = getServer(); const carrier = server === 'player' ? player : ai; const zOffset = server === 'player' ? -0.05 : 0.05; const xOffset = server === 'player' ? -0.4 : 0.4;
    ball.pos.set(carrier.pos.x + xOffset, 1.02 + Math.sin(performance.now() * 0.004) * 0.035, carrier.pos.z + zOffset); ball.mesh.position.copy(ball.pos); updateTrail(false); return;
  }
  if (!rallyLive) return;

  const steps = 4; const sdt = dt / steps;
  for (let i = 0; i < steps; i += 1) {
    const previousZ = ball.pos.z;
    ball.vel.y -= 9.81 * sdt; ball.vel.x += ball.spin.y * ball.vel.z * 0.014 * sdt; ball.spin.multiplyScalar(0.999); ball.pos.addScaledVector(ball.vel, sdt);

    if ((previousZ > 0 && ball.pos.z <= 0) || (previousZ < 0 && ball.pos.z >= 0)) {
      // Crossing the net is tracked implicitly by side/bounce validation.
    }

    if (ball.pos.y < ball.radius) {
      ball.pos.y = ball.radius; const side = sideOf(ball.pos.z);
      if (side === lastHitter) {
        if (serviceActive) { serviceFault(); return; }
        pointTo(opposite(lastHitter), 'PALLA SUL PROPRIO CAMPO'); return;
      }
      ball.vel.y = Math.abs(ball.vel.y) * 0.72; ball.vel.x *= 0.965; ball.vel.z *= 0.965; sound.tone('bounce', 0.5);
      groundBounces[side] += 1; legalBounce[side] = true;
      if (serviceActive) {
        if (validServiceBounce()) {
          if (netTouchedOnServe) { serviceActive = false; rallyLive = false; pointLocked = true; showMessage('NET · RIPETI'); pointTimer = setTimeout(() => { pointLocked = false; resetBall(getServer(), true); }, 800); return; }
          serviceActive = false; serviceFenceFaultPending = true; statusEl.textContent = 'RALLY';
        } else { serviceFault(); return; }
      }
      if (groundBounces[side] >= 2) { pointTo(opposite(side), 'DOPPIO RIMBALZO'); return; }
    }

    if (Math.abs(ball.pos.z) < 0.115 && ball.pos.y < COURT.netH + 0.08) {
      ball.pos.z = Math.sign(previousZ || ball.vel.z || 1) * 0.125; ball.vel.z *= -0.36; ball.vel.y *= 0.55; sound.tone('bounce', 0.48); if (serviceActive) netTouchedOnServe = true;
    }

    if (Math.abs(ball.pos.x) > COURT.halfW - ball.radius) {
      if (ball.pos.y > 4.03) { pointTo(opposite(lastHitter), 'FUORI DAL CAMPO'); return; }
      const wallSide = sideOf(ball.pos.z);
      if (serviceActive) { serviceFault(); return; }
      if (serviceFenceFaultPending && wallSide === serviceReceiver && Math.abs(ball.pos.z) < 6.05) { serviceFault('SERVIZIO SULLA GRIGLIA'); return; }
      if (wallSide !== lastHitter && !legalBounce[wallSide]) { pointTo(wallSide, 'VETRO DIRETTO · FUORI'); return; }
      ball.pos.x = Math.sign(ball.pos.x) * (COURT.halfW - ball.radius); ball.vel.x *= -0.78; sound.tone('glass', 0.46);
    }
    if (Math.abs(ball.pos.z) > COURT.halfL - ball.radius) {
      if (ball.pos.y > 4.03) { pointTo(opposite(lastHitter), 'FUORI DAL CAMPO'); return; }
      const wallSide = sideOf(ball.pos.z);
      if (serviceActive) { serviceFault(); return; }
      if (wallSide !== lastHitter && !legalBounce[wallSide]) { pointTo(wallSide, 'VETRO DIRETTO · FUORI'); return; }
      ball.pos.z = Math.sign(ball.pos.z) * (COURT.halfL - ball.radius); ball.vel.z *= -0.76; sound.tone('glass', 0.5);
    }
    if (ball.pos.y > 9 || Math.abs(ball.pos.x) > 6.4 || Math.abs(ball.pos.z) > 11.5 || ball.pos.y < -1) { pointTo(opposite(lastHitter), 'FUORI'); return; }
  }

  ball.mesh.position.copy(ball.pos); ball.mesh.rotation.x += ball.spin.x * dt; ball.mesh.rotation.y += ball.spin.y * dt; ball.mesh.rotation.z += ball.spin.z * dt; updateTrail(true);
}

function updateTrail(active) {
  for (let i = ball.trail.length - 1; i > 0; i -= 1) ball.trail[i].position.lerp(ball.trail[i - 1].position, 0.52);
  if (ball.trail[0]) ball.trail[0].position.lerp(ball.pos, 0.64);
  for (let i = 0; i < ball.trail.length; i += 1) {
    const t = ball.trail[i];
    t.visible = active && !reducedMotion;
    if (t.material) t.material.opacity = active ? Math.max(0.025, 0.36 - i * 0.024) : 0;
  }
}

function pointTo(winner, reason) {
  if (pointLocked) return; pointLocked = true; rallyLive = false; serviceActive = false; statusEl.textContent = reason;
  const result = score.point(winner); updateScoreUI();
  if (result.type === 'set') showMessage(winner === 'player' ? 'SET · VITTORIA' : 'SET · CPU');
  else if (result.type === 'game') showMessage(winner === 'player' ? 'GAME · TU' : 'GAME · CPU');
  else showMessage(winner === 'player' ? 'PUNTO · TU' : 'PUNTO · CPU');
  if (result.tieBreakStarted) setLabelEl.textContent = 'TIE-BREAK';
  pointTimer = setTimeout(() => {
    pointLocked = false;
    if (score.finished) endMatchUI(); else resetBall(getServer());
  }, result.type === 'set' ? 1200 : 1050);
}

function updateScoreUI() {
  const d = score.display(); playerScoreEl.textContent = d.playerPoint; aiScoreEl.textContent = d.aiPoint; gamesScoreEl.textContent = `${d.playerGames} — ${d.aiGames}`; setLabelEl.textContent = d.tieBreak ? 'TIE-BREAK' : 'SET 1';
}

function updateRallyUI() {
  rallyCounter.querySelector('b').textContent = String(Math.max(0, stats.currentRally)); rallyCounter.classList.toggle('hidden', stats.currentRally < 2);
}

function showMessage(text) {
  message.textContent = text; message.classList.add('show'); setTimeout(() => message.classList.remove('show'), 800);
}

function updateCamera(dt) {
  if (appMode === 'menu' || appMode === 'boot' || appMode === 'ended') {
    menuOrbit += dt * 0.13; const desired = new THREE.Vector3(Math.sin(menuOrbit) * 15, 7.7, Math.cos(menuOrbit) * 18); camera.position.lerp(desired, 1 - Math.exp(-1.6 * dt)); camera.lookAt(0, 1.1, 0); return;
  }
  const shot = computeGameplayCamera({ THREE, cameraMode, player, ball });
  const { desired, look } = shot;
  camera.position.lerp(desired, 1 - Math.exp(-5 * dt));
  if (shake > 0) { shake = Math.max(0, shake - dt); camera.position.x += (Math.random() - 0.5) * shake * 0.45; camera.position.y += (Math.random() - 0.5) * shake * 0.22; }
  const currentLook = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).add(camera.position); currentLook.lerp(look, 1 - Math.exp(-7 * dt)); camera.lookAt(currentLook);
}

function pollGamepad() {
  const gp = navigator.getGamepads?.()[0]; if (!gp) return;
  const hit = !!gp.buttons[0]?.pressed; if (hit && !gamepadHitWasDown) playerHit(); gamepadHitWasDown = hit;
  const cam = !!gp.buttons[3]?.pressed; if (cam && !gamepadCameraWasDown) cameraMode = (cameraMode + 1) % 3; gamepadCameraWasDown = cam;
  const pause = !!gp.buttons[9]?.pressed; if (pause && !gamepadPauseWasDown) pauseGame(); gamepadPauseWasDown = pause;
}

function animate() {
  requestAnimationFrame(animate); const dt = Math.min(clock.getDelta(), 0.033);
  pollGamepad();
  if (appMode === 'playing') {
    power += powerDir * dt * 0.58; if (power > 1) { power = 1; powerDir = -1; } if (power < 0.12) { power = 0.12; powerDir = 1; } $('#power i').style.height = `${power * 100}%`;
    if (hitBuffer > 0) { hitBuffer = Math.max(0, hitBuffer - dt); if (playerHit()) hitBuffer = 0; }
    updatePlayer(dt); updateAI(dt); updateBall(dt);
    updateGameplayGuides({ THREE, guides: gameplayGuides, player, ai, ball, rallyLive, hitReach: PLAYER_TUNING.hitReach, maxHitHeight: PLAYER_TUNING.maxHitHeight, court: COURT, now: performance.now(), dt });
  }
  updateCamera(dt); composer.render();
}

function resizeRenderer() {
  if (!renderer || !camera || !composer) return; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight);
}

async function enterImmersiveMode() {
  try {
    if (!document.fullscreenElement) {
      const target = document.documentElement;
      const request = target.requestFullscreen || target.webkitRequestFullscreen;
      if (request) await request.call(target);
    }
  } catch (error) {
    console.debug('Fullscreen non disponibile su questo browser:', error);
  }
  try { await screen.orientation?.lock?.('landscape'); } catch {}
  setTimeout(() => window.scrollTo(0, 1), 60);
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else enterImmersiveMode();
}

function setupEvents() {
  addEventListener('resize', resizeRenderer);
  addEventListener('keydown', (event) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    keys.add(event.code);
    if (event.code === 'Space' && !hitPressed) { hitPressed = true; playerHit(); }
    if (event.code === 'KeyC' && appMode === 'playing') cameraMode = (cameraMode + 1) % 3;
    if ((event.code === 'Escape' || event.code === 'KeyP') && (appMode === 'playing' || appMode === 'paused')) pauseGame();
    if (event.code === 'KeyF') toggleFullscreen();
  });
  addEventListener('keyup', (event) => { keys.delete(event.code); if (event.code === 'Space') hitPressed = false; });
  addEventListener('blur', () => { keys.clear(); if (appMode === 'playing') pauseGame(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && appMode === 'playing') pauseGame(true); });

  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd < 320) event.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
  document.addEventListener('gesturestart', (event) => event.preventDefault(), { passive: false });
  document.addEventListener('gesturechange', (event) => event.preventDefault(), { passive: false });
  document.addEventListener('gestureend', (event) => event.preventDefault(), { passive: false });
  document.addEventListener('dblclick', (event) => event.preventDefault(), { passive: false });

  $('#startGame').addEventListener('click', () => { enterImmersiveMode(); startMatch(); }); $('#howToPlay').addEventListener('click', () => tutorial.classList.remove('hidden'));
  $('[data-close="tutorial"]').addEventListener('click', () => tutorial.classList.add('hidden'));
  $('#pauseButton').addEventListener('click', () => pauseGame(true)); $('#resumeGame').addEventListener('click', () => pauseGame(false)); $('#restartGame').addEventListener('click', restartMatch);
  $('#backToMenu').addEventListener('click', showMenu); $('#endToMenu').addEventListener('click', showMenu); $('#playAgain').addEventListener('click', startMatch);
  $('#fullscreenButton').addEventListener('click', toggleFullscreen); soundButton.addEventListener('click', () => sound.setEnabled(!sound.enabled));
  difficultySelect.addEventListener('change', () => { settings.difficulty = difficultySelect.value; localStorage.setItem('padelNovaDifficulty', settings.difficulty); });
  qualitySelect.addEventListener('change', () => { settings.quality = qualitySelect.value; localStorage.setItem('padelNovaQuality', settings.quality); applyQuality(); });

  const stick = $('#touchStick'); const knob = stick.querySelector('i'); let pointerId = null;
  const updateStick = (event) => {
  const r = stick.getBoundingClientRect();
  const dx = event.clientX - (r.left + r.width / 2);
  const dy = event.clientY - (r.top + r.height / 2);
  const max = r.width * 0.37;
  const len = Math.hypot(dx, dy) || 1;
  const clamped = Math.min(len, max);
  const nx = dx / len;
  const ny = dy / len;
  const px = nx * clamped;
  const py = ny * clamped;
  const normalized = clamped / max;
  const curve = joystickCurve(normalized);
  knob.style.transform = `translate(${px}px,${py}px)`;
  touchVector.x = THREE.MathUtils.clamp(nx * curve, -1, 1);
  touchVector.z = THREE.MathUtils.clamp(ny * curve, -1, 1);
};
stick.addEventListener('pointerdown' , (event) => { pointerId = event.pointerId; stick.setPointerCapture(pointerId); updateStick(event); });
  stick.addEventListener('pointermove', (event) => { if (event.pointerId === pointerId) updateStick(event); });
  const clearStick = (event) => { if (pointerId !== null && (!event || event.pointerId === pointerId)) { pointerId = null; touchVector.x = touchVector.z = 0; knob.style.transform = 'translate(0,0)'; } };
  stick.addEventListener('pointerup', clearStick); stick.addEventListener('pointercancel', clearStick);
  $('#touchHit').addEventListener('pointerdown', (event) => { event.preventDefault(); hitBuffer = 0.32; if (playerHit()) hitBuffer = 0; });

  window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); installPrompt = event; $('#installApp').classList.remove('hidden'); });
  $('#installApp').addEventListener('click', async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $('#installApp').classList.add('hidden'); });
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  try { await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }); } catch (error) { console.warn('Service worker non registrato:', error); }
}

async function bootApp() {
  bootStatus.textContent = 'Inizializzazione WebGL…';
  if (!initRenderer()) return;
  bootStatus.textContent = 'Costruzione arena…'; addCourt(); addSeasideArena({ THREE, scene, mat });
  player.group = makePlayer(0x30282b, false); player.racket = player.group.userData.racket; player.group.position.copy(player.pos);
  ai.group = makePlayer(0x263b5f, true); ai.racket = ai.group.userData.racket; ai.group.position.copy(ai.pos); ai.group.rotation.y = Math.PI;
  makeBall(); gameplayGuides = createGameplayGuides({ THREE, scene }); ball.pos.set(0, 1, 0); ball.mesh.position.copy(ball.pos); updateTrail(false); applyQuality(); setupEvents(); updateScoreUI();
  bootStatus.textContent = 'Arena pronta'; await new Promise((resolve) => setTimeout(resolve, 360)); boot.style.opacity = '0'; await new Promise((resolve) => setTimeout(resolve, 600)); boot.classList.add('hidden');
  menu.classList.remove('hidden'); appMode = 'menu'; animate(); registerServiceWorker();
}

bootApp();
