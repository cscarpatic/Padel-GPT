import test from 'node:test';
import assert from 'node:assert/strict';
import { flatCpuServePoint } from '../src/service.js';

const radius = 0.105;
const netHeight = 0.88;

function validateSide(startX, targetX) {
  const start = { x: startX, y: 0.84, z: -7.5 };
  const target = { x: targetX, y: radius, z: 6.25 };
  const first = flatCpuServePoint({ start, target, progress: 0, netHeight, ballRadius: radius });
  const last = flatCpuServePoint({ start, target, progress: 1, netHeight, ballRadius: radius });
  assert.deepEqual({ x: first.x, y: first.y, z: first.z }, start);
  assert.ok(Math.abs(last.x - target.x) < 1e-9);
  assert.ok(Math.abs(last.y - target.y) < 1e-9);
  assert.ok(Math.abs(last.z - target.z) < 1e-9);

  const probe = flatCpuServePoint({ start, target, progress: 0.5, netHeight, ballRadius: radius });
  const atNet = flatCpuServePoint({ start, target, progress: probe.netFraction, netHeight, ballRadius: radius });
  assert.ok(atNet.y >= netHeight + radius + 0.01);

  let maxY = -Infinity;
  let maxProgress = 0;
  for (let i = 0; i <= 1000; i += 1) {
    const progress = i / 1000;
    const point = flatCpuServePoint({ start, target, progress, netHeight, ballRadius: radius });
    if (point.y > maxY) {
      maxY = point.y;
      maxProgress = progress;
    }
  }
  assert.ok(maxY <= netHeight + radius + 0.015, `serve peaks too high: ${maxY}`);
  assert.ok(Math.abs(maxProgress - atNet.netFraction) < 0.01, `peak should be at net, got ${maxProgress}`);
  assert.ok(target.z < 6.95, 'target must remain inside service box');
}

test('flat CPU serve has no lob arc from deuce side', () => validateSide(-1.75, 1.35));
test('flat CPU serve has no lob arc from ad side', () => validateSide(2.55, -1.35));
