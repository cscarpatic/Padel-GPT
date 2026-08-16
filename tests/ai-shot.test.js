import test from 'node:test';
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
