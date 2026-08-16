from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label} target missing')
    return text.replace(old, new, 1)

main_path = Path('src/main.js')
main = main_path.read_text()
old_service = """function launchService(target, hitter) {
  const { velocity } = computeSafeRallyVelocity({
    start: ball.pos,
    target,
    horizontalSpeed: hitter === 'ai' ? 13.2 : 13.8,
    liftHint: 4.1,
    netHeight: COURT.netH,
    ballRadius: ball.radius,
    clearanceMargin: 0.1
  });
  ball.vel.set(velocity.x, velocity.y, velocity.z);
  ball.spin.set(0, 0, -ball.vel.x * 0.16);
  recordShotSpeed();
}
"""
new_service = """function launchService(target, hitter) {
  const cpuServe = hitter === 'ai';
  const { velocity } = computeSafeRallyVelocity({
    start: ball.pos,
    target,
    horizontalSpeed: cpuServe ? 18.0 : 13.8,
    liftHint: cpuServe ? 2.35 : 4.1,
    netHeight: COURT.netH,
    ballRadius: ball.radius,
    clearanceMargin: cpuServe ? 0.025 : 0.1
  });
  ball.vel.set(velocity.x, velocity.y, velocity.z);
  ball.spin.set(0, 0, -ball.vel.x * (cpuServe ? 0.08 : 0.16));
  recordShotSpeed();
}
"""
main = replace_once(main, old_service, new_service, 'service trajectory')
main_path.write_text(main)

style_path = Path('src/style.css')
style = style_path.read_text()
old_mobile = ".status{top:calc(var(--safe-top) + 66px)}.rally{top:calc(var(--safe-top) + 98px)}"
new_mobile = ".status{top:var(--safe-top);right:var(--safe-right);left:auto;transform:none;max-width:min(42vw,240px);overflow:hidden;text-overflow:ellipsis}.rally{top:calc(var(--safe-top) + 40px);right:var(--safe-right);left:auto;transform:none}"
style = replace_once(style, old_mobile, new_mobile, 'mobile status layout')
style_path.write_text(style)

verify = Path('.github/scripts/verify_cpu_serve.mjs')
verify.write_text("""import { computeSafeRallyVelocity } from '../../src/physics.js';

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
""")