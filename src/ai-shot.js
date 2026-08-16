const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

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
