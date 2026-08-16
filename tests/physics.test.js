import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSafeRallyVelocity } from '../src/physics.js';

const G = 9.81;
const R = 0.105;
const NET_COLLISION_HEIGHT = 0.88 + 0.08;
const HALF_W = 5;
const HALF_L = 10;

const DIFFICULTY = {
  beginner: { power: 0.72, accuracy: 2.6 },
  rookie: { power: 0.80, accuracy: 2.25 },
  pro: { power: 0.90, accuracy: 1.5 },
  elite: { power: 1.00, accuracy: 0.8 }
};

function prng(seed = 0x51f15e) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function integrateFirstBounce(start, velocity, spinY) {
  const dt = 1 / 120;
  let { x, y, z } = start;
  let { x: vx, y: vy, z: vz } = velocity;
  let netY = null;

  for (let step = 0; step < 480; step += 1) {
    const px = x; const py = y; const pz = z;
    vy -= G * dt;
    vx += spinY * vz * 0.014 * dt;
    spinY *= 0.999 ** 2;
    x += vx * dt; y += vy * dt; z += vz * dt;

    if ((pz < 0 && z >= 0) || (pz > 0 && z <= 0)) {
      const fraction = Math.abs(pz) / (Math.abs(pz) + Math.abs(z));
      netY = py + (y - py) * fraction;
    }

    if (y <= R) return { x, y: R, z, netY };
  }

  throw new Error('Ball did not reach its first bounce');
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

test('headless match simulation keeps rally shots above the net and inside court', () => {
  const rnd = prng(20260816);

  for (const [difficulty, level] of Object.entries(DIFFICULTY)) {
    for (let rally = 0; rally < 150; rally += 1) {
      let side = 'player';
      let start = {
        x: -2.5 + rnd() * 5,
        y: 0.25 + rnd() * 1.55,
        z: 3 + rnd() * 3
      };

      for (let shot = 0; shot < 20; shot += 1) {
        let target; let speed; let lift;

        if (side === 'player') {
          const power = 0.12 + rnd() * 0.88;
          const xIntent = -1 + rnd() * 2;
          const smash = start.y > 1.55 && rnd() < 0.5 ? 1 : 0;
          const lob = rnd() < 0.16 ? 1 : 0;
          target = { x: clamp(start.x + xIntent * 3.2, -4.25, 4.25), y: R, z: lob ? -8.2 : -7.4 };
          speed = 10.2 + power * 5.2 + smash * 2.7 - lob * 1.2;
          lift = 2.4 + power * 1.8 + smash + lob * 2.5;
        } else {
          const playerX = -3.5 + rnd() * 7;
          const aggressive = start.y > 1.5 ? 1 : 0;
          target = {
  x: clamp(playerX * 0.18 + (rnd() - 0.5) * level.accuracy * 1.6, -3.25, 3.25),
  y: R,
  z: 6.3 + rnd() * 1.2
};
speed = (7.6 + rnd() * 1.0 + aggressive * 0.55) * level.power;
lift = 3.7 + rnd() * 1.0 + aggressive * 0.3;
        }

        const { velocity } = computeSafeRallyVelocity({ start, target, horizontalSpeed: speed, liftHint: lift });
        const bounce = integrateFirstBounce(start, velocity, side === 'player' ? 3.5 : -3.5);

        assert.ok(bounce.netY !== null && bounce.netY >= NET_COLLISION_HEIGHT,
          `${difficulty} rally ${rally} shot ${shot} hit the net at ${bounce.netY}`);
        assert.ok(Math.abs(bounce.x) < HALF_W - R,
          `${difficulty} rally ${rally} shot ${shot} bounced outside sideline at x=${bounce.x}`);
        assert.ok(Math.abs(bounce.z) < HALF_L - R,
          `${difficulty} rally ${rally} shot ${shot} bounced beyond back wall at z=${bounce.z}`);
        assert.equal(side === 'player' ? bounce.z < 0 : bounce.z > 0, true,
          `${difficulty} rally ${rally} shot ${shot} bounced on the wrong side`);

        side = side === 'player' ? 'ai' : 'player';
        start = {
          x: clamp(bounce.x + (rnd() - 0.5) * 0.16, -4.4, 4.4),
          y: 0.25 + rnd() * 1.2,
          z: side === 'ai' ? clamp(bounce.z, -8.8, -0.8) : clamp(bounce.z, 0.8, 8.8)
        };
      }
    }
  }
});
