import test from 'node:test';
import assert from 'node:assert/strict';
import { predictFirstGroundContact } from '../src/presentation.js';

test('landing prediction returns the first ground contact in front of the ball', () => {
  const hit = predictFirstGroundContact({
    position: { x: 0.4, y: 2.1, z: -2.5 },
    velocity: { x: 1.2, y: 2.5, z: 8.4 },
    radius: 0.105
  });
  assert.ok(hit);
  assert.ok(hit.time > 0);
  assert.ok(hit.z > -2.5);
  assert.ok(Number.isFinite(hit.x));
});

test('landing prediction rejects impossible/expired contacts', () => {
  const hit = predictFirstGroundContact({
    position: { x: 0, y: 200, z: 0 },
    velocity: { x: 0, y: 30, z: 1 },
    maxTime: 0.1
  });
  assert.equal(hit, null);
});
