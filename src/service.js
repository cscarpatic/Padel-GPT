function clamp01(value) {
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
