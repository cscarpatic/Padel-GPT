import test from 'node:test';
import assert from 'node:assert/strict';
import { MatchScore, pointLabel } from '../src/scoring.js';

test('traditional advantage scoring labels', () => {
  assert.equal(pointLabel(0, 0), '0');
  assert.equal(pointLabel(1, 0), '15');
  assert.equal(pointLabel(3, 3), '40');
  assert.equal(pointLabel(4, 3), 'AD');
  assert.equal(pointLabel(3, 4), '40');
});

test('game requires two-point margin after deuce', () => {
  const score = new MatchScore();
  ['player','player','player','ai','ai','ai','player'].forEach((s) => score.point(s));
  assert.equal(score.display().playerPoint, 'AD');
  const result = score.point('player');
  assert.equal(result.type, 'game');
  assert.equal(score.games.player, 1);
});

test('set enters tiebreak at 6-6 and finishes at two-point margin', () => {
  const score = new MatchScore();
  const winGame = (side) => { for (let i = 0; i < 4; i += 1) score.point(side); };
  for (let i = 0; i < 6; i += 1) { winGame('player'); winGame('ai'); }
  assert.equal(score.tieBreak, true);
  for (let i = 0; i < 6; i += 1) { score.point('player'); score.point('ai'); }
  score.point('player');
  const result = score.point('player');
  assert.equal(result.type, 'set');
  assert.equal(score.finished, true);
  assert.equal(score.games.player, 7);
});
