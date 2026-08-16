import test from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTY, PLAYER_TUNING, joystickCurve } from '../src/gameplay.js';

test('iPad player tuning is fast and forgiving', () => {
  assert.ok(PLAYER_TUNING.speed >= 9);
  assert.ok(PLAYER_TUNING.touchBoost >= 1.2);
  assert.ok(PLAYER_TUNING.hitReach >= 2);
  assert.ok(PLAYER_TUNING.acceleration >= 24);
});

test('beginner mode is significantly easier than pro', () => {
  assert.ok(DIFFICULTY.beginner.speed < DIFFICULTY.pro.speed);
  assert.ok(DIFFICULTY.beginner.reaction > DIFFICULTY.pro.reaction);
  assert.ok(DIFFICULTY.beginner.power < DIFFICULTY.pro.power);
  assert.ok(DIFFICULTY.beginner.assist > DIFFICULTY.pro.assist);
  assert.ok(DIFFICULTY.beginner.aiReach < DIFFICULTY.pro.aiReach);
});

test('joystick response is precise near center and reaches full input', () => {
  assert.equal(joystickCurve(0), 0);
  assert.ok(joystickCurve(0.1) > 0 && joystickCurve(0.1) < 0.25);
  assert.ok(joystickCurve(0.5) > 0.45 && joystickCurve(0.5) < 0.7);
  assert.equal(joystickCurve(1), 1);
});
