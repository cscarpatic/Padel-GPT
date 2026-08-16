from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label} target missing')
    return text.replace(old, new, 1)


athlete = Path('src/athlete.js')
text = athlete.read_text()
text = replace_once(
    text,
    "  const arms = [];\n  const forearms = [];\n  const armBaseZ = [];",
    "  const arms = [];\n  const forearms = [];\n  const handPivots = [];\n  const armBaseZ = [];",
    'athlete arm arrays',
)
text = replace_once(
    text,
    "    const hand = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 10), skin));\n    hand.position.y = -0.35;\n    hand.scale.set(0.82, 1.05, 0.74);\n    forearmPivot.add(hand);\n\n    arms.push(shoulder);\n    forearms.push(forearmPivot);",
    "    const handPivot = new THREE.Group();\n    handPivot.position.y = -0.35;\n    forearmPivot.add(handPivot);\n\n    const hand = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 10), skin));\n    hand.scale.set(0.82, 1.05, 0.74);\n    handPivot.add(hand);\n\n    arms.push(shoulder);\n    forearms.push(forearmPivot);\n    handPivots.push(handPivot);",
    'athlete hand pivot',
)
text = replace_once(
    text,
    "  racket.position.set(0.36, 1.08, 0.02);\n  bodyRoot.add(racket);",
    "  racket.position.set(0.015, -0.015, 0.01);\n  racket.rotation.set(0.08, -0.2, -0.32);\n  handPivots[1].add(racket);",
    'racket hand parent',
)
text = replace_once(
    text,
    "  group.userData.forearms = forearms;\n  group.userData.armBaseZ = armBaseZ;",
    "  group.userData.forearms = forearms;\n  group.userData.handPivots = handPivots;\n  group.userData.armBaseZ = armBaseZ;",
    'athlete userdata',
)
athlete.write_text(text)

main = Path('src/main.js')
text = main.read_text()
text = replace_once(
    text,
    "let hitBuffer = 0;\nlet pendingTouchShot = null;",
    "let hitBuffer = 0;\nlet impactEffects = [];\nlet pendingTouchShot = null;",
    'impact state',
)

start = text.index('function animateActor(actor, dt, isAI) {')
end = text.index('\nfunction updatePlayer(dt) {', start)
new_animate = r'''function animateActor(actor, dt, isAI) {
  actor.group.position.lerp(actor.pos, 1 - Math.exp(-16 * dt));
  const speedFactor = Math.min(1, actor.vel.length() / 5.2);
  const gait = Math.sin(performance.now() * 0.0145) * speedFactor;
  const lateral = THREE.MathUtils.clamp(actor.vel.x / 9, -1, 1);
  const forward = THREE.MathUtils.clamp(actor.vel.z / 9, -1, 1);
  actor.group.position.y = Math.abs(gait) * 0.032;

  const rig = actor.group.userData;
  const bodyRoot = rig.bodyRoot;
  const head = rig.head;
  const legs = rig.legs;
  const anchors = rig.legAnchors;
  const arms = rig.arms;
  const forearms = rig.forearms;
  const hands = rig.handPivots;
  const armBaseZ = rig.armBaseZ;
  const racket = rig.racket;
  const direction = isAI ? -1 : 1;

  if (bodyRoot) {
    bodyRoot.rotation.z = THREE.MathUtils.lerp(bodyRoot.rotation.z, -lateral * 0.07, 0.16);
    bodyRoot.rotation.x = THREE.MathUtils.lerp(bodyRoot.rotation.x, forward * 0.045, 0.16);
  }
  if (head) head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, lateral * 0.035, 0.14);
  if (legs) {
    legs[0].rotation.x = gait * 0.5;
    legs[1].rotation.x = -gait * 0.5;
  }
  if (anchors) {
    anchors[0].lower.rotation.x = Math.max(0, -gait) * 0.42;
    anchors[1].lower.rotation.x = Math.max(0, gait) * 0.42;
    anchors[0].shoe.rotation.x = Math.max(0, -gait) * 0.2;
    anchors[1].shoe.rotation.x = Math.max(0, gait) * 0.2;
  }

  if (arms && armBaseZ) {
    arms[0].rotation.x = -gait * 0.28;
    arms[0].rotation.z = THREE.MathUtils.lerp(arms[0].rotation.z, armBaseZ[0], 0.18);
  }
  if (forearms) forearms[0].rotation.x = Math.max(0, gait) * 0.18;

  const prep = actor.prep || 0;
  if (actor.swing > 0) {
    actor.swing = Math.max(0, actor.swing - dt * 3.15);
    const phase = 1 - actor.swing;
    const windup = THREE.MathUtils.smoothstep(phase, 0, 0.3);
    const contact = Math.exp(-Math.pow((phase - 0.46) / 0.13, 2));
    const follow = THREE.MathUtils.smoothstep(phase, 0.42, 0.94);
    const hitSide = actor.swingSide || 1;
    const hitHeight = THREE.MathUtils.clamp(((actor.swingHeight || 1.1) - 0.6) / 1.8, 0, 1);

    if (bodyRoot) {
      bodyRoot.rotation.y = direction * hitSide * (-0.34 * windup + 0.72 * follow);
      bodyRoot.rotation.x += -0.08 * contact - 0.08 * hitHeight;
      bodyRoot.position.z = contact * 0.13;
    }
    if (head) head.rotation.y = direction * hitSide * (0.12 * windup - 0.18 * follow);
    if (arms && armBaseZ) {
      arms[1].rotation.x = -0.18 - 0.86 * contact - 0.28 * hitHeight;
      arms[1].rotation.z = armBaseZ[1] - direction * hitSide * (0.55 * windup - 0.92 * follow);
      arms[0].rotation.x -= 0.12 * contact;
    }
    if (forearms) {
      forearms[1].rotation.x = -0.14 - 0.72 * contact;
      forearms[1].rotation.z = direction * hitSide * (0.62 * windup - 1.18 * follow);
    }
    if (hands) {
      hands[1].rotation.y = -direction * hitSide * (0.35 * windup + 1.05 * contact - 0.48 * follow);
      hands[1].rotation.z = direction * hitSide * (-0.22 * windup + 0.78 * follow);
      hands[1].rotation.x = -0.28 * contact - 0.18 * hitHeight;
    }
    if (racket) {
      racket.rotation.x = 0.08 - 0.38 * contact;
      racket.rotation.y = -0.2 - direction * hitSide * (0.52 * windup + 1.08 * contact - 0.5 * follow);
      racket.rotation.z = -0.32 + direction * hitSide * (0.32 * windup + 0.82 * follow);
      racket.position.z = 0.01 + contact * 0.18;
    }
  } else if (prep > 0.01) {
    const hitSide = actor.swingSide || 1;
    if (bodyRoot) {
      bodyRoot.rotation.y = THREE.MathUtils.lerp(bodyRoot.rotation.y, -direction * hitSide * 0.28, 0.18);
      bodyRoot.position.z = THREE.MathUtils.lerp(bodyRoot.position.z, 0, 0.2);
    }
    if (arms && armBaseZ) {
      arms[1].rotation.x = THREE.MathUtils.lerp(arms[1].rotation.x, -0.18, 0.2);
      arms[1].rotation.z = THREE.MathUtils.lerp(arms[1].rotation.z, armBaseZ[1] - direction * hitSide * 0.5, 0.2);
    }
    if (forearms) {
      forearms[1].rotation.x = THREE.MathUtils.lerp(forearms[1].rotation.x, -0.22, 0.2);
      forearms[1].rotation.z = THREE.MathUtils.lerp(forearms[1].rotation.z, direction * hitSide * 0.5, 0.2);
    }
    if (hands) hands[1].rotation.y = THREE.MathUtils.lerp(hands[1].rotation.y, -direction * hitSide * 0.42, 0.2);
    if (racket) {
      racket.rotation.y = THREE.MathUtils.lerp(racket.rotation.y, -0.2 - direction * hitSide * 0.45, 0.2);
      racket.rotation.z = THREE.MathUtils.lerp(racket.rotation.z, -0.32 + direction * hitSide * 0.22, 0.2);
    }
  } else {
    if (bodyRoot) {
      bodyRoot.rotation.y = THREE.MathUtils.lerp(bodyRoot.rotation.y, 0, 0.16);
      bodyRoot.position.z = THREE.MathUtils.lerp(bodyRoot.position.z, 0, 0.18);
    }
    if (arms && armBaseZ) {
      arms[1].rotation.x = THREE.MathUtils.lerp(arms[1].rotation.x, gait * 0.2, 0.18);
      arms[1].rotation.z = THREE.MathUtils.lerp(arms[1].rotation.z, armBaseZ[1], 0.18);
    }
    if (forearms) {
      forearms[1].rotation.x = THREE.MathUtils.lerp(forearms[1].rotation.x, 0.08, 0.18);
      forearms[1].rotation.z = THREE.MathUtils.lerp(forearms[1].rotation.z, 0, 0.18);
    }
    if (hands) {
      hands[1].rotation.x = THREE.MathUtils.lerp(hands[1].rotation.x, 0, 0.18);
      hands[1].rotation.y = THREE.MathUtils.lerp(hands[1].rotation.y, 0, 0.18);
      hands[1].rotation.z = THREE.MathUtils.lerp(hands[1].rotation.z, 0, 0.18);
    }
    if (racket) {
      racket.rotation.x = THREE.MathUtils.lerp(racket.rotation.x, 0.08, 0.18);
      racket.rotation.y = THREE.MathUtils.lerp(racket.rotation.y, -0.2, 0.18);
      racket.rotation.z = THREE.MathUtils.lerp(racket.rotation.z, -0.32, 0.18);
      racket.position.z = THREE.MathUtils.lerp(racket.position.z, 0.01, 0.18);
    }
  }
}
'''
text = text[:start] + new_animate + text[end:]

fx = r'''function showImpactFX(color = 0xffffff) {
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.18, 28), material);
  ring.position.copy(ball.pos);
  ring.quaternion.copy(camera.quaternion);
  scene.add(ring);
  impactEffects.push({ mesh: ring, life: 0.16, maxLife: 0.16 });
}

function updateImpactFX(dt) {
  for (let i = impactEffects.length - 1; i >= 0; i -= 1) {
    const fx = impactEffects[i];
    fx.life -= dt;
    const t = 1 - Math.max(0, fx.life) / fx.maxLife;
    fx.mesh.scale.setScalar(1 + t * 2.2);
    fx.mesh.material.opacity = Math.max(0, 0.95 * (1 - t));
    fx.mesh.quaternion.copy(camera.quaternion);
    if (fx.life <= 0) {
      scene.remove(fx.mesh);
      fx.mesh.geometry.dispose();
      fx.mesh.material.dispose();
      impactEffects.splice(i, 1);
    }
  }
}

'''
text = replace_once(text, 'function playerHit() {', fx + 'function playerHit() {', 'impact FX insertion')
text = replace_once(
    text,
    "    launchTowards(new THREE.Vector3(targetX, ball.radius, targetZ), 9.8 + shotPower * 5.8 + smash * 2.5 - lob * 1.0, 2.55 + shotPower * 1.65 + smash * 0.9 + lob * 2.65, 'player');\n    prepareAfterHit('player'); pendingTouchShot = null; player.swing = 1; shake = reducedMotion ? 0 : 0.14; sound.tone('hit', 1.12); statusEl.textContent = smash ? 'SMASH' : lob ? 'LOB' : 'RALLY';",
    "    player.swingSide = Math.sign(ball.pos.x - player.pos.x) || 1;\n    player.swingHeight = ball.pos.y;\n    player.prep = 0;\n    showImpactFX(0xeaff75);\n    launchTowards(new THREE.Vector3(targetX, ball.radius, targetZ), 9.8 + shotPower * 5.8 + smash * 2.5 - lob * 1.0, 2.55 + shotPower * 1.65 + smash * 0.9 + lob * 2.65, 'player');\n    prepareAfterHit('player'); pendingTouchShot = null; player.swing = 1; shake = reducedMotion ? 0 : 0.14; sound.tone('hit', 1.12); statusEl.textContent = smash ? 'SMASH' : lob ? 'LOB' : 'RALLY';",
    'player impact animation',
)
text = replace_once(
    text,
    "  launchTowards(new THREE.Vector3(targetX, ball.radius, targetZ), speed, lift, 'ai');\n  prepareAfterHit('ai'); ai.swing = 1; shake = reducedMotion ? 0 : 0.055; sound.tone('hit', 0.78);",
    "  ai.swingSide = Math.sign(ball.pos.x - ai.pos.x) || 1;\n  ai.swingHeight = ball.pos.y;\n  showImpactFX(0xff8a78);\n  launchTowards(new THREE.Vector3(targetX, ball.radius, targetZ), speed, lift, 'ai');\n  prepareAfterHit('ai'); ai.swing = 1; shake = reducedMotion ? 0 : 0.055; sound.tone('hit', 0.78);",
    'ai impact animation',
)
text = replace_once(text, '  updateCamera(dt); composer.render();', '  updateImpactFX(dt);\n  updateCamera(dt); composer.render();', 'impact update loop')
text = replace_once(
    text,
    "    touchShotGesture = { active: true, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startedAt: performance.now(), aim: 0, lob: 0, charge: 0.45 };\n    hitButton.setPointerCapture?.(event.pointerId);",
    "    touchShotGesture = { active: true, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startedAt: performance.now(), aim: 0, lob: 0, charge: 0.45 };\n    player.prep = 1;\n    player.swingSide = ball.pos.x >= player.pos.x ? 1 : -1;\n    player.swingHeight = ball.pos.y;\n    hitButton.setPointerCapture?.(event.pointerId);",
    'touch preparation',
)
text = replace_once(
    text,
    "    touchShotGesture.active = false;\n    touchShotGesture.pointerId = null;\n    hitButton.classList.remove('charging');",
    "    touchShotGesture.active = false;\n    touchShotGesture.pointerId = null;\n    player.prep = 0;\n    hitButton.classList.remove('charging');",
    'touch release prep',
)
text = replace_once(
    text,
    "      touchShotGesture.active = false; touchShotGesture.pointerId = null; hitButton.classList.remove('charging'); hitButton.style.removeProperty('--aim-x');",
    "      touchShotGesture.active = false; touchShotGesture.pointerId = null; player.prep = 0; hitButton.classList.remove('charging'); hitButton.style.removeProperty('--aim-x');",
    'touch cancel prep',
)
main.write_text(text)

css_path = Path('src/style.css')
css = css_path.read_text()
css = replace_once(
    css,
    '#touchHit{--aim-x:0px;pointer-events:auto;width:116px;height:116px;',
    '#touchHit{--aim-x:0px;pointer-events:auto;position:fixed;right:var(--safe-right);bottom:var(--safe-bottom);width:116px;height:116px;',
    'HIT fixed right',
)
css = replace_once(
    css,
    '#power{right:var(--safe-right);bottom:calc(var(--safe-bottom) + 115px);height:112px}#speed{right:var(--safe-right);bottom:calc(var(--safe-bottom) + 240px)}',
    '#power{right:calc(var(--safe-right) + 138px);bottom:calc(var(--safe-bottom) + 6px);height:106px}#speed{right:calc(var(--safe-right) + 132px);bottom:calc(var(--safe-bottom) + 124px)}',
    'mobile power layout',
)
css_path.write_text(css)
