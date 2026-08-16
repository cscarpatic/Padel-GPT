import { computeSafeRallyVelocity } from '../../src/physics.js';

const gravity = 9.81;
const netHeight = 0.88;
const radius = 0.105;

function sample(start, target) {
  const { velocity, flightTime } = computeSafeRallyVelocity({
    start,
    target,
    horizontalSpeed: 18.0,
    liftHint: 2.35,
    netHeight,
    ballRadius: radius,
    clearanceMargin: 0.025
  });
  const fraction = Math.abs(start.z) / (Math.abs(start.z) + Math.abs(target.z));
  const tNet = flightTime * fraction;
  const yNet = start.y + velocity.y * tNet - 0.5 * gravity * tNet * tNet;
  const tApex = Math.max(0, velocity.y / gravity);
  const apex = start.y + velocity.y * tApex - 0.5 * gravity * tApex * tApex;
  if (yNet <= netHeight + radius + 0.015) throw new Error(`CPU serve clips net: ${yNet}`);
  if (apex >= 1.28) throw new Error(`CPU serve too loopy: apex ${apex}`);
  if (flightTime >= 0.82) throw new Error(`CPU serve flight too slow: ${flightTime}`);
  return { yNet, apex, flightTime };
}

const left = sample({ x: -1.75, y: 0.72, z: -7.5 }, { x: 1.55, y: radius, z: 4.4 });
const right = sample({ x: 1.75, y: 0.72, z: -7.5 }, { x: -1.55, y: radius, z: 4.4 });
console.log('CPU serve validation', { left, right });
