from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label} target missing')
    return text.replace(old, new, 1)

main_path = Path('src/main.js')
main = main_path.read_text()

main = replace_once(
    main,
    "import { chooseAiRallyShot } from './ai-shot.js';\n",
    "import { chooseAiRallyShot } from './ai-shot.js';\nimport { AI_SERVE_RECEIVE, computeAiServeReceiveTarget, isAiServeReceivePhase } from './serve-receive.js';\n",
    'serve receive import'
)

old_update_ai = """function updateAI(dt) {
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
  const canReturn = !serviceActive && !cpuServeFlight;
  if (rallyLive && ball.pos.z < 0 && horizontalBallDistance(ai) < level.aiReach && ball.pos.y < 2.95 && canReturn && aiReactionTimer <= 0) {
    aiReactionTimer = level.reaction;
    aiHit();
  }
}
"""

new_update_ai = """function updateAI(dt) {
  const level = DIFFICULTY[settings.difficulty];
  const receivingPlayerServe = isAiServeReceivePhase({
    serviceActive,
    serviceFenceFaultPending,
    serviceReceiver,
    lastHitter
  });
  ai.speed = receivingPlayerServe ? Math.max(level.speed, AI_SERVE_RECEIVE.minSpeed) : level.speed;
  aiReactionTimer -= dt;
  let targetX = THREE.MathUtils.clamp(ball.pos.x * 0.72, -3.5, 3.5);
  let targetZ = -6.8;

  if (receivingPlayerServe && rallyLive) {
    const receiveTarget = computeAiServeReceiveTarget({ ballPos: ball.pos, ballVel: ball.vel });
    targetX = receiveTarget.x;
    targetZ = receiveTarget.z;
  } else if (rallyLive && ball.pos.z < 0) {
    const lookAhead = ball.vel.z < 0 ? 0.14 : 0.06;
    const predictedX = ball.pos.x + ball.vel.x * lookAhead;
    const predictedZ = ball.pos.z + ball.vel.z * lookAhead;
    targetZ = THREE.MathUtils.clamp(predictedZ - 0.48, -8.6, -1.7);
    targetX = THREE.MathUtils.clamp(predictedX, -3.95, 3.95);
  }

  const to = new THREE.Vector3(targetX - ai.pos.x, 0, targetZ - ai.pos.z);
  if (to.length() > 0.08) to.normalize().multiplyScalar(ai.speed);
  ai.vel.lerp(to, 1 - Math.exp(-(receivingPlayerServe ? 10.5 : 7) * dt));
  ai.pos.addScaledVector(ai.vel, dt);
  clampActor(ai, 'ai');
  ai.group.rotation.y = THREE.MathUtils.lerp(ai.group.rotation.y, Math.atan2(ball.pos.x - ai.pos.x, ball.pos.z - ai.pos.z), receivingPlayerServe ? 0.22 : 0.14);
  animateActor(ai, dt, true);

  const canReturn = !serviceActive && !cpuServeFlight;
  const returnReach = receivingPlayerServe ? Math.max(level.aiReach, AI_SERVE_RECEIVE.reach) : level.aiReach;
  const reactionReady = receivingPlayerServe || aiReactionTimer <= 0;
  if (rallyLive && ball.pos.z < 0 && horizontalBallDistance(ai) < returnReach && ball.pos.y < 2.95 && canReturn && reactionReady) {
    aiReactionTimer = receivingPlayerServe ? AI_SERVE_RECEIVE.followUpDelay : level.reaction;
    aiHit();
  }
}
"""
main = replace_once(main, old_update_ai, new_update_ai, 'updateAI')

main_path.write_text(main)

Path('src/serve-receive.js').write_text("""const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const AI_SERVE_RECEIVE = {
  minSpeed: 7.4,
  reach: 2.25,
  lookAhead: 0.18,
  followUpDelay: 0.12
};

export function isAiServeReceivePhase({
  serviceActive = false,
  serviceFenceFaultPending = false,
  serviceReceiver = 'player',
  lastHitter = 'ai'
}) {
  return serviceReceiver === 'ai' && lastHitter === 'player' && (serviceActive || serviceFenceFaultPending);
}

export function computeAiServeReceiveTarget({ ballPos, ballVel }) {
  const lookAhead = AI_SERVE_RECEIVE.lookAhead;
  return {
    x: clamp(ballPos.x + ballVel.x * lookAhead, -3.95, 3.95),
    z: clamp(ballPos.z + ballVel.z * lookAhead - 0.12, -8.65, -2.0)
  };
}
""")

Path('tests/serve-receive.test.js').write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSafeRallyVelocity } from '../src/physics.js';
import { AI_SERVE_RECEIVE, computeAiServeReceiveTarget, isAiServeReceivePhase } from '../src/serve-receive.js';

const radius = 0.105;

test('AI serve receive phase is active before and after the legal first bounce', () => {
  assert.equal(isAiServeReceivePhase({ serviceActive: true, serviceReceiver: 'ai', lastHitter: 'player' }), true);
  assert.equal(isAiServeReceivePhase({ serviceFenceFaultPending: true, serviceReceiver: 'ai', lastHitter: 'player' }), true);
  assert.equal(isAiServeReceivePhase({ serviceActive: true, serviceReceiver: 'player', lastHitter: 'ai' }), false);
});

test('serve receive target leads the incoming ball and stays on the AI side', () => {
  const target = computeAiServeReceiveTarget({
    ballPos: { x: -1.8, z: -3.5 },
    ballVel: { x: -0.2, z: -12 }
  });
  assert.ok(target.x < -1.8);
  assert.ok(target.z < -5.5);
  assert.ok(target.z >= -8.65 && target.z <= -2.0);
});

function simulatePlayerServe(sideSign) {
  const start = { x: sideSign * 2.15 - 0.4, y: 0.72, z: 7.5 };
  const target = { x: -sideSign * 1.85, y: radius, z: -4.4 };
  const { velocity } = computeSafeRallyVelocity({
    start,
    target,
    horizontalSpeed: 13.8,
    liftHint: 4.1,
    netHeight: 0.88,
    ballRadius: radius,
    clearanceMargin: 0.1
  });

  const ball = { ...start };
  const vel = { ...velocity };
  const ai = { x: -sideSign * 1.6, z: -5.9, vx: 0, vz: 0 };
  const dt = 1 / 120;
  let firstBounce = false;
  let returnOpportunity = false;

  for (let step = 0; step < 480; step += 1) {
    const receiveTarget = computeAiServeReceiveTarget({ ballPos: ball, ballVel: vel });
    let dx = receiveTarget.x - ai.x;
    let dz = receiveTarget.z - ai.z;
    const len = Math.hypot(dx, dz);
    if (len > 0.08) {
      dx = dx / len * AI_SERVE_RECEIVE.minSpeed;
      dz = dz / len * AI_SERVE_RECEIVE.minSpeed;
    } else {
      dx = 0;
      dz = 0;
    }
    const blend = 1 - Math.exp(-10.5 * dt);
    ai.vx += (dx - ai.vx) * blend;
    ai.vz += (dz - ai.vz) * blend;
    ai.x += ai.vx * dt;
    ai.z += ai.vz * dt;

    vel.y -= 9.81 * dt;
    ball.x += vel.x * dt;
    ball.y += vel.y * dt;
    ball.z += vel.z * dt;

    if (ball.y <= radius) {
      ball.y = radius;
      if (!firstBounce) {
        firstBounce = true;
        vel.y = Math.abs(vel.y) * 0.72;
        vel.x *= 0.965;
        vel.z *= 0.965;
      } else {
        break;
      }
    }

    if (firstBounce && ball.z < 0 && ball.y < 2.95) {
      const distance = Math.hypot(ball.x - ai.x, ball.z - ai.z);
      if (distance < AI_SERVE_RECEIVE.reach) {
        returnOpportunity = true;
        break;
      }
    }
  }

  return returnOpportunity;
}

test('AI can reach a legal player serve from both service sides', () => {
  assert.equal(simulatePlayerServe(1), true);
  assert.equal(simulatePlayerServe(-1), true);
});
""")
