import { computeSafeRallyVelocity } from '../../src/physics.js';

const gravity = 9.81;
const netHeight = 0.88;
const radius = 0.105;

function verify(start, target) {
  const { velocity, flightTime } = computeSafeRallyVelocity({
    start,
    target,
    horizontalSpeed: 30.0,
    liftHint: 1.5,
    netHeight,
    ballRadius: radius,
    clearanceMargin: 0.0
  });
  const fraction = Math.abs(start.z) / (Math.abs(start.z) + Math.abs(target.z));
  const tNet = flightTime * fraction;
  const yNet = start.y + velocity.y * tNet - 0.5 * gravity * tNet * tNet;
  const tApex = Math.max(0, velocity.y / gravity);
  const apex = start.y + velocity.y * tApex - 0.5 * gravity * tApex * tApex;
  const speedKmh = Math.hypot(velocity.x, velocity.y, velocity.z) * 3.6;
  if (yNet <= netHeight + radius + 0.01) throw new Error(`serve too low at net: ${yNet}`);
  if (apex >= 1.12) throw new Error(`serve still too loopy: ${apex}`);
  if (flightTime >= 0.75) throw new Error(`serve too slow: ${flightTime}`);
  if (speedKmh < 65) throw new Error(`serve too slow visually: ${speedKmh}`);
  if (Math.abs(target.z) > 6.95) throw new Error('serve target outside service line');
  return { yNet, apex, flightTime, speedKmh };
}

const left = verify({ x: -1.75, y: 0.72, z: -7.5 }, { x: 1.45, y: radius, z: 6.2 });
const right = verify({ x: 2.55, y: 0.72, z: -7.5 }, { x: -1.45, y: radius, z: 6.2 });
console.log({ left, right });
