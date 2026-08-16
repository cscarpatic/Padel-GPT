export function predictFirstGroundContact({ position, velocity, gravity = 9.81, radius = 0.105, maxTime = 2.5 }) {
  const a = -0.5 * gravity;
  const b = velocity.y;
  const c = position.y - radius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant <= 0) return null;
  const root = Math.sqrt(discriminant);
  const candidates = [(-b - root) / (2 * a), (-b + root) / (2 * a)].filter((t) => t > 0.015 && t <= maxTime);
  if (!candidates.length) return null;
  const t = Math.max(...candidates);
  return { x: position.x + velocity.x * t, y: radius, z: position.z + velocity.z * t, time: t };
}

export function addSeasideArena({ THREE, scene, mat }) {
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(74, 90),
    new THREE.MeshStandardMaterial({ color: 0x4abcf2, roughness: 0.34, metalness: 0.08 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.34;
  water.receiveShadow = true;
  scene.add(water);

  const pierMat = mat(0x875634, 0.82, 0.02);
  const goldMat = mat(0xc89b42, 0.38, 0.28);
  const whiteMat = mat(0xf4f8fb, 0.35, 0.04);
  const navyMat = mat(0x14365d, 0.32, 0.14);

  const pier = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.18, 10), pierMat);
  pier.position.set(0, 0.12, -17.2);
  pier.receiveShadow = true;
  scene.add(pier);
  for (let z = -13.2; z >= -21.2; z -= 1.35) {
    for (const x of [-1.34, 1.34]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 1.05, 12), pierMat);
      post.position.set(x, 0.35, z);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 16), goldMat);
      cap.position.set(x, 0.9, z);
      scene.add(post, cap);
    }
  }

  const makeBoat = (x, z, scale = 1) => {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.SphereGeometry(1.05, 18, 10), whiteMat);
    hull.scale.set(1.35, 0.35, 0.52);
    hull.position.y = 0.05;
    boat.add(hull);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.18, 0.7), navyMat);
    deck.position.set(0, 0.31, 0);
    boat.add(deck);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.7, 8), navyMat);
    mast.position.set(0.18, 1.0, 0);
    boat.add(mast);
    boat.position.set(x, -0.03, z);
    boat.scale.setScalar(scale);
    scene.add(boat);
  };
  makeBoat(-5.5, -16.6, 0.9);
  makeBoat(5.7, -18.4, 1.05);

  const sponsorCanvas = document.createElement('canvas');
  sponsorCanvas.width = 1024; sponsorCanvas.height = 128;
  const ctx = sponsorCanvas.getContext('2d');
  ctx.fillStyle = '#f8fbff'; ctx.fillRect(0, 0, 1024, 128);
  const labels = ['PADEL//NOVA', 'SEASIDE CUP', 'MARINA', 'PRO TOUR'];
  ctx.font = '700 38px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  labels.forEach((label, i) => {
    const x = i * 256;
    ctx.fillStyle = i % 2 ? '#eaf2ff' : '#ffffff'; ctx.fillRect(x, 0, 256, 128);
    ctx.fillStyle = i % 2 ? '#1f63e9' : '#31588e'; ctx.fillText(label, x + 128, 64);
  });
  const sponsorTexture = new THREE.CanvasTexture(sponsorCanvas);
  sponsorTexture.colorSpace = THREE.SRGBColorSpace;
  const sponsorMat = new THREE.MeshBasicMaterial({ map: sponsorTexture, toneMapped: false });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 1.18), sponsorMat);
  board.position.set(0, 0.8, -9.72);
  scene.add(board);
}

export function createGameplayGuides({ THREE, scene }) {
  const ringMaterial = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
  const playerRing = new THREE.Mesh(new THREE.RingGeometry(0.54, 0.68, 48), ringMaterial(0x39d8ff, 0.88));
  const aiRing = new THREE.Mesh(new THREE.RingGeometry(0.54, 0.68, 48), ringMaterial(0xff3f66, 0.82));
  playerRing.rotation.x = aiRing.rotation.x = -Math.PI / 2;
  playerRing.position.y = aiRing.position.y = 0.02;
  scene.add(playerRing, aiRing);

  const impact = new THREE.Group();
  const impactOuter = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.35, 40), ringMaterial(0xffe956, 0.94));
  impactOuter.rotation.x = -Math.PI / 2;
  const impactInner = new THREE.Mesh(new THREE.CircleGeometry(0.06, 28), ringMaterial(0xffffff, 0.94));
  impactInner.rotation.x = -Math.PI / 2;
  impactInner.position.y = 0.002;
  impact.add(impactOuter, impactInner);
  impact.position.y = 0.023;
  impact.visible = false;
  scene.add(impact);

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 256;
  const ctx = shadowCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 18, 128, 128, 120);
  gradient.addColorStop(0, 'rgba(0,0,0,.38)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 256);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const ballShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.58), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: 0.42, depthWrite: false }));
  ballShadow.rotation.x = -Math.PI / 2;
  ballShadow.position.y = 0.012;
  scene.add(ballShadow);

  return { playerRing, aiRing, impact, impactOuter, ballShadow };
}

export function updateGameplayGuides({ THREE, guides, player, ai, ball, rallyLive, hitReach, maxHitHeight, court, now, dt }) {
  if (!guides) return;
  guides.playerRing.position.set(player.pos.x, 0.02, player.pos.z);
  guides.aiRing.position.set(ai.pos.x, 0.02, ai.pos.z);

  const reachable = ball.pos.z > 0 && Math.hypot(ball.pos.x - player.pos.x, ball.pos.z - player.pos.z) < hitReach && ball.pos.y < maxHitHeight;
  guides.playerRing.material.color.setHex(reachable ? 0x83ff66 : 0x39d8ff);
  guides.playerRing.material.opacity = reachable ? 1 : 0.82;
  const pulse = 1 + Math.sin(now * 0.009) * (reachable ? 0.09 : 0.025);
  guides.playerRing.scale.setScalar(pulse);

  guides.ballShadow.position.set(ball.pos.x, 0.012, ball.pos.z);
  const shadowScale = THREE.MathUtils.clamp(1.08 - ball.pos.y * 0.1, 0.4, 1.08);
  guides.ballShadow.scale.setScalar(shadowScale);
  guides.ballShadow.material.opacity = THREE.MathUtils.clamp(0.48 - ball.pos.y * 0.055, 0.08, 0.42);

  const contact = rallyLive ? predictFirstGroundContact({ position: ball.pos, velocity: ball.vel, radius: ball.radius }) : null;
  const valid = contact && contact.z > 0.18 && contact.z < court.halfL && Math.abs(contact.x) < court.halfW;
  guides.impact.visible = !!valid;
  if (valid) {
    const target = new THREE.Vector3(contact.x, 0.023, contact.z);
    guides.impact.position.lerp(target, 1 - Math.exp(-15 * dt));
    guides.impact.rotation.y += dt * 1.8;
    const landingPulse = 1 + Math.sin(now * 0.012) * 0.08;
    guides.impact.scale.setScalar(landingPulse);
    guides.impactOuter.material.color.setHex(contact.time < 0.48 ? 0xff9f43 : 0xffe956);
  }
}

export function computeGameplayCamera({ THREE, cameraMode, player, ball }) {
  if (cameraMode === 0) {
    return {
      desired: new THREE.Vector3(2.4 + player.pos.x * 0.14, 7.55, player.pos.z + 8.9),
      look: new THREE.Vector3(ball.pos.x * 0.3, 1.05, ball.pos.z * 0.5)
    };
  }
  if (cameraMode === 1) {
    return { desired: new THREE.Vector3(12.7, 9.8, 13.2), look: new THREE.Vector3(0, 0.9, -0.6) };
  }
  return { desired: new THREE.Vector3(0, 17.8, 10.6), look: new THREE.Vector3(0, 0, -0.6) };
}
