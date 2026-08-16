from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label} target missing')
    return text.replace(old, new, 1)

main_path = Path('src/main.js')
main = main_path.read_text()
main = replace_once(
    main,
    "import { flatCpuServePoint } from './service.js';\n",
    "import { flatCpuServePoint } from './service.js';\nimport { chooseAiRallyShot } from './ai-shot.js';\n",
    'ai shot import'
)

old_ai = """function aiHit() {
  if (!rallyLive || pointLocked || serviceActive || cpuServeFlight) return;
  const level = DIFFICULTY[settings.difficulty];
  const aggressive = ball.pos.y > 1.5 ? 1 : 0;
  const targetX = THREE.MathUtils.clamp(
    player.pos.x * 0.18 + (Math.random() - 0.5) * level.accuracy * 1.6,
    -3.25,
    3.25
  );
  const targetZ = 6.3 + Math.random() * 1.2;
  const speed = (7.6 + Math.random() * 1.0 + aggressive * 0.55) * level.power;
  const lift = 3.7 + Math.random() * 1.0 + aggressive * 0.3;
  ai.swingSide = Math.sign(ball.pos.x - ai.pos.x) || 1;
  ai.swingHeight = ball.pos.y;
  showImpactFX(0xff8a78);
  launchTowards(new THREE.Vector3(targetX, ball.radius, targetZ), speed, lift, 'ai');
  prepareAfterHit('ai'); ai.swing = 1; shake = reducedMotion ? 0 : 0.055; sound.tone('hit', 0.78);
}
"""
new_ai = """function aiHit() {
  if (!rallyLive || pointLocked || serviceActive || cpuServeFlight) return;
  const level = DIFFICULTY[settings.difficulty];
  const shot = chooseAiRallyShot({
    difficulty: settings.difficulty,
    playerX: player.pos.x,
    playerZ: player.pos.z,
    ballY: ball.pos.y,
    accuracy: level.accuracy,
    rollLob: Math.random(),
    rollX: Math.random(),
    rollDepth: Math.random(),
    rollSpeed: Math.random()
  });
  ai.swingSide = Math.sign(ball.pos.x - ai.pos.x) || 1;
  ai.swingHeight = ball.pos.y;
  showImpactFX(shot.type === 'lob' ? 0xffc57a : 0xff8a78);
  launchTowards(
    new THREE.Vector3(shot.targetX, ball.radius, shot.targetZ),
    shot.horizontalSpeed,
    shot.liftHint,
    'ai'
  );
  prepareAfterHit('ai'); ai.swing = 1; shake = reducedMotion ? 0 : 0.055; sound.tone('hit', shot.type === 'lob' ? 0.7 : 0.84);
}
"""
main = replace_once(main, old_ai, new_ai, 'aiHit')
main_path.write_text(main)

Path('src/ai-shot.js').write_text("""const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const DIFFICULTY_SHOT_BOOST = {
  beginner: 0,
  rookie: 0.6,
  pro: 1.2,
  elite: 1.8
};

export function chooseAiRallyShot({
  difficulty = 'beginner',
  playerX = 0,
  playerZ = 6,
  ballY = 1,
  accuracy = 2.6,
  rollLob = Math.random(),
  rollX = Math.random(),
  rollDepth = Math.random(),
  rollSpeed = Math.random()
}) {
  const aggressive = ballY > 1.5;
  const playerCrowdingNet = playerZ < 3.8;
  const lobChance = playerCrowdingNet ? 0.14 : 0.015;
  const lob = ballY < 1.45 && rollLob < lobChance;
  const boost = DIFFICULTY_SHOT_BOOST[difficulty] ?? 0;

  const targetX = clamp(
    playerX * 0.18 + (rollX - 0.5) * accuracy * 1.6,
    -3.25,
    3.25
  );

  if (lob) {
    return {
      type: 'lob',
      targetX,
      targetZ: 8.1 + rollDepth * 0.65,
      horizontalSpeed: 9.3 + rollSpeed * 0.9,
      liftHint: 5.8 + rollDepth * 0.6,
      lobChance
    };
  }

  return {
    type: aggressive ? 'attack' : 'drive',
    targetX,
    targetZ: 6.45 + rollDepth * 0.9,
    horizontalSpeed: 16.0 + rollSpeed * 2.0 + (aggressive ? 1.3 : 0) + boost,
    liftHint: 2.45 + rollDepth * 0.5 + (aggressive ? 0.1 : 0),
    lobChance
  };
}
""")

Path('tests/ai-shot.test.js').write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseAiRallyShot } from '../src/ai-shot.js';
import { computeSafeRallyVelocity } from '../src/physics.js';

const difficulties = [
  ['beginner', 2.6],
  ['rookie', 2.25],
  ['pro', 1.5],
  ['elite', 0.8]
];

test('AI normal rally shots stay fast at every difficulty', () => {
  for (const [difficulty, accuracy] of difficulties) {
    const shot = chooseAiRallyShot({
      difficulty,
      playerZ: 6,
      ballY: 1.05,
      accuracy,
      rollLob: 0.5,
      rollX: 0.5,
      rollDepth: 0.5,
      rollSpeed: 0
    });
    assert.equal(shot.type, 'drive');
    assert.ok(shot.horizontalSpeed >= 16, `${difficulty} drive too slow: ${shot.horizontalSpeed}`);
    assert.ok(shot.liftHint < 3.1, `${difficulty} drive lift too high: ${shot.liftHint}`);
  }
});

test('AI only uses lobs rarely from the baseline and selectively near the net', () => {
  let baselineLobs = 0;
  let netLobs = 0;
  for (let i = 0; i < 1000; i += 1) {
    const roll = (i + 0.5) / 1000;
    const common = { difficulty: 'beginner', ballY: 1.0, accuracy: 2.6, rollLob: roll, rollX: 0.5, rollDepth: 0.5, rollSpeed: 0.5 };
    if (chooseAiRallyShot({ ...common, playerZ: 6 }).type === 'lob') baselineLobs += 1;
    if (chooseAiRallyShot({ ...common, playerZ: 3 }).type === 'lob') netLobs += 1;
  }
  assert.ok(baselineLobs <= 16, `too many baseline lobs: ${baselineLobs}`);
  assert.ok(netLobs >= 130 && netLobs <= 150, `unexpected tactical lob rate: ${netLobs}`);
});

test('representative AI drives do not create lob-like arcs', () => {
  const gravity = 9.81;
  for (const startZ of [-2.5, -5, -7.5]) {
    const shot = chooseAiRallyShot({
      difficulty: 'beginner',
      playerZ: 6,
      ballY: 1.05,
      accuracy: 2.6,
      rollLob: 0.5,
      rollX: 0.5,
      rollDepth: 0.5,
      rollSpeed: 0
    });
    const start = { x: 0, y: 1.05, z: startZ };
    const target = { x: shot.targetX, y: 0.105, z: shot.targetZ };
    const { velocity } = computeSafeRallyVelocity({
      start,
      target,
      horizontalSpeed: shot.horizontalSpeed,
      liftHint: shot.liftHint,
      netHeight: 0.88,
      ballRadius: 0.105
    });
    const tApex = Math.max(0, velocity.y / gravity);
    const apex = start.y + velocity.y * tApex - 0.5 * gravity * tApex * tApex;
    assert.ok(apex < 1.85, `drive arc too high from z=${startZ}: ${apex}`);
  }
});
""")
