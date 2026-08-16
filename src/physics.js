export function computeSafeRallyVelocity({
  start,
  target,
  horizontalSpeed,
  liftHint = 3,
  gravity = 9.81,
  netHeight = 0.88,
  ballRadius = 0.105,
  clearanceMargin = 0.12
}) {
  const dx = target.x - start.x;
  const dy = target.y - start.y;
  const dz = target.z - start.z;
  const horizontalDistance = Math.hypot(dx, dz);
  let flightTime = Math.max(0.34, horizontalDistance / Math.max(0.001, horizontalSpeed));

  if (start.z * target.z < 0) {
    const fractionToNet = Math.abs(start.z) / (Math.abs(start.z) + Math.abs(target.z));
    const requestedClearance = netHeight + ballRadius + clearanceMargin + Math.max(0, liftHint - 3) * 0.025;
    const linearHeightAtNet = start.y * (1 - fractionToNet) + target.y * fractionToNet;
    const numerator = 2 * (requestedClearance - linearHeightAtNet);
    const denominator = gravity * fractionToNet * (1 - fractionToNet);

    if (numerator > 0 && denominator > 0) {
      const minimumFlightTime = Math.sqrt(numerator / denominator);
      flightTime = Math.max(flightTime, minimumFlightTime + 0.025);
    }
  }

  return {
    velocity: {
      x: dx / flightTime,
      y: (dy + 0.5 * gravity * flightTime * flightTime) / flightTime,
      z: dz / flightTime
    },
    flightTime
  };
}
