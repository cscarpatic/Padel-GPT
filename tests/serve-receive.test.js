import test from 'node:test';
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
