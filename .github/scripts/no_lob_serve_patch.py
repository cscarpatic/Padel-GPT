from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label} target missing')
    return text.replace(old, new, 1)

main_path = Path('src/main.js')
main = main_path.read_text()

main = replace_once(
    main,
    "import { DIFFICULTY, PLAYER_TUNING, joystickCurve } from './gameplay.js';\n",
    "import { DIFFICULTY, PLAYER_TUNING, joystickCurve } from './gameplay.js';\nimport { flatCpuServePoint } from './service.js';\n",
    'service import'
)

main = replace_once(
    main,
    "let serveAnimation = null;\nlet serviceActive = false;",
    "let serveAnimation = null;\nlet cpuServeFlight = null;\nlet serviceActive = false;",
    'cpu serve state'
)

main = replace_once(
    main,
    "appMode = 'menu'; clearTimeout(pointTimer); pointLocked = false; rallyLive = false; serveReady = false; serveAnimation = null;",
    "appMode = 'menu'; clearTimeout(pointTimer); pointLocked = false; rallyLive = false; serveReady = false; serveAnimation = null; cpuServeFlight = null;",
    'menu reset'
)

main = replace_once(
    main,
    "rallyLive = false; serveReady = true; serveAnimation = null; serviceActive = false; netTouchedOnServe = false; serviceFenceFaultPending = false;",
    "rallyLive = false; serveReady = true; serveAnimation = null; cpuServeFlight = null; serviceActive = false; netTouchedOnServe = false; serviceFenceFaultPending = false;",
    'ball reset'
)

main = replace_once(
    main,
    "    const k = (s.t - 0.24) / 0.22; ball.pos.y = THREE.MathUtils.lerp(ball.radius, 0.72, Math.sin(k * Math.PI / 2));",
    "    const k = (s.t - 0.24) / 0.22; const strikeHeight = s.server === 'ai' ? 0.84 : 0.72; ball.pos.y = THREE.MathUtils.lerp(ball.radius, strikeHeight, Math.sin(k * Math.PI / 2));",
    'serve strike height'
)

main = replace_once(
    main,
    "    const targetX = serviceTargetSign * (s.server === 'ai' ? 1.45 : 1.85);\n    const targetZ = s.server === 'player' ? -4.4 : 6.2;\n    const target = new THREE.Vector3(targetX, ball.radius, targetZ);\n    launchService(target, s.server); serveAnimation = null; rallyLive = true; lastHitter = s.server; stats.currentRally = 1; updateRallyUI();",
    "    const targetX = serviceTargetSign * (s.server === 'ai' ? 1.35 : 1.85);\n    const targetZ = s.server === 'player' ? -4.4 : 6.25;\n    const target = new THREE.Vector3(targetX, ball.radius, targetZ);\n    if (s.server === 'ai') startCpuFlatServe(target); else launchService(target, s.server);\n    serveAnimation = null; rallyLive = true; lastHitter = s.server; stats.currentRally = 1; updateRallyUI();",
    'serve launch branch'
)

marker = "function launchService(target, hitter) {\n"
insert = """function startCpuFlatServe(target) {
  const duration = 0.54;
  cpuServeFlight = {
    elapsed: 0,
    duration,
    start: ball.pos.clone(),
    target: target.clone()
  };
  const dx = target.x - ball.pos.x;
  const dz = target.z - ball.pos.z;
  ball.vel.set(dx / duration, 0, dz / duration);
  ball.spin.set(0, 0, -ball.vel.x * 0.035);
  recordShotSpeed();
}

function updateCpuFlatServe(dt) {
  if (!cpuServeFlight) return;
  const flight = cpuServeFlight;
  const previousX = ball.pos.x;
  const previousY = ball.pos.y;
  const previousZ = ball.pos.z;
  flight.elapsed += dt;
  const progress = Math.min(1, flight.elapsed / flight.duration);
  const point = flatCpuServePoint({
    start: flight.start,
    target: flight.target,
    progress,
    netHeight: COURT.netH,
    ballRadius: ball.radius,
    clearance: 0.014
  });

  ball.pos.set(point.x, point.y, point.z);
  const invDt = 1 / Math.max(dt, 0.001);
  ball.vel.set(
    (ball.pos.x - previousX) * invDt,
    (ball.pos.y - previousY) * invDt,
    (ball.pos.z - previousZ) * invDt
  );
  ball.mesh.position.copy(ball.pos);
  ball.mesh.rotation.z += ball.spin.z * dt;
  updateTrail(true);

  if (progress < 1) return;

  cpuServeFlight = null;
  serviceActive = false;
  netTouchedOnServe = false;
  serviceFenceFaultPending = true;
  groundBounces[serviceReceiver] = 1;
  legalBounce[serviceReceiver] = true;
  statusEl.textContent = 'RALLY';
  sound.tone('bounce', 0.52);

  const dx = flight.target.x - flight.start.x;
  const dz = flight.target.z - flight.start.z;
  const horizontalLength = Math.max(0.001, Math.hypot(dx, dz));
  const postBounceSpeed = 9.6;
  ball.vel.set(
    dx / horizontalLength * postBounceSpeed,
    2.35,
    dz / horizontalLength * postBounceSpeed
  );
  ball.spin.set(0, 0, -ball.vel.x * 0.08);
}

"""
if marker not in main:
    raise SystemExit('launchService marker missing')
main = main.replace(marker, insert + marker, 1)

main = replace_once(
    main,
    "function aiHit() {\n  if (!rallyLive || pointLocked || serviceActive && serviceReceiver === 'ai') return;",
    "function aiHit() {\n  if (!rallyLive || pointLocked || serviceActive || cpuServeFlight) return;",
    'AI hit service guard'
)

main = replace_once(
    main,
    "  const canReturn = !(serviceActive && serviceReceiver === 'ai');",
    "  const canReturn = !serviceActive && !cpuServeFlight;",
    'AI return guard'
)

main = replace_once(
    main,
    "function updateBall(dt) {\n  if (serveAnimation) { updateServeAnimation(dt); return; }",
    "function updateBall(dt) {\n  if (serveAnimation) { updateServeAnimation(dt); return; }\n  if (cpuServeFlight) { updateCpuFlatServe(dt); return; }",
    'flat serve update hook'
)

main = replace_once(
    main,
    "function pointTo(winner, reason) {\n  if (pointLocked) return; pointLocked = true; rallyLive = false; serviceActive = false; statusEl.textContent = reason;",
    "function pointTo(winner, reason) {\n  if (pointLocked) return; pointLocked = true; rallyLive = false; serviceActive = false; cpuServeFlight = null; statusEl.textContent = reason;",
    'point cleanup'
)

main_path.write_text(main)

service_path = Path('src/service.js')
service_path.write_text("""function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

export function flatCpuServePoint({
  start,
  target,
  progress,
  netHeight = 0.88,
  ballRadius = 0.105,
  clearance = 0.014
}) {
  const p = clamp01(progress);
  const totalZ = Math.abs(start.z) + Math.abs(target.z);
  const netFraction = totalZ > 0.001 ? Math.abs(start.z) / totalZ : 0.5;
  const netY = netHeight + ballRadius + clearance;

  let y;
  if (p <= netFraction) {
    const local = netFraction > 0.001 ? p / netFraction : 1;
    y = start.y + (netY - start.y) * smoothstep(local);
  } else {
    const denom = Math.max(0.001, 1 - netFraction);
    const local = (p - netFraction) / denom;
    y = netY + (target.y - netY) * smoothstep(local);
  }

  return {
    x: start.x + (target.x - start.x) * p,
    y,
    z: start.z + (target.z - start.z) * p,
    netFraction,
    netY
  };
}
""")

test_path = Path('tests/service.test.js')
test_path.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import { flatCpuServePoint } from '../src/service.js';

const radius = 0.105;
const netHeight = 0.88;

function validateSide(startX, targetX) {
  const start = { x: startX, y: 0.84, z: -7.5 };
  const target = { x: targetX, y: radius, z: 6.25 };
  const first = flatCpuServePoint({ start, target, progress: 0, netHeight, ballRadius: radius });
  const last = flatCpuServePoint({ start, target, progress: 1, netHeight, ballRadius: radius });
  assert.deepEqual({ x: first.x, y: first.y, z: first.z }, start);
  assert.ok(Math.abs(last.x - target.x) < 1e-9);
  assert.ok(Math.abs(last.y - target.y) < 1e-9);
  assert.ok(Math.abs(last.z - target.z) < 1e-9);

  const probe = flatCpuServePoint({ start, target, progress: 0.5, netHeight, ballRadius: radius });
  const atNet = flatCpuServePoint({ start, target, progress: probe.netFraction, netHeight, ballRadius: radius });
  assert.ok(atNet.y >= netHeight + radius + 0.01);

  let maxY = -Infinity;
  let maxProgress = 0;
  for (let i = 0; i <= 1000; i += 1) {
    const progress = i / 1000;
    const point = flatCpuServePoint({ start, target, progress, netHeight, ballRadius: radius });
    if (point.y > maxY) {
      maxY = point.y;
      maxProgress = progress;
    }
  }
  assert.ok(maxY <= netHeight + radius + 0.015, `serve peaks too high: ${maxY}`);
  assert.ok(Math.abs(maxProgress - atNet.netFraction) < 0.01, `peak should be at net, got ${maxProgress}`);
  assert.ok(target.z < 6.95, 'target must remain inside service box');
}

test('flat CPU serve has no lob arc from deuce side', () => validateSide(-1.75, 1.35));
test('flat CPU serve has no lob arc from ad side', () => validateSide(2.55, -1.35));
""")
