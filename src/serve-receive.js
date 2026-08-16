const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const AI_SERVE_RECEIVE = {
  minSpeed: 7.4,
  reach: 2.25,
  lookAhead: 0.18,
  followUpDelay: 0.12
};

export function isAiServeReceivePhase({
  serviceActive = false,
  serviceFenceFaultPending = false,
  serviceReceiver = 'player',
  lastHitter = 'ai'
}) {
  return serviceReceiver === 'ai' && lastHitter === 'player' && (serviceActive || serviceFenceFaultPending);
}

export function computeAiServeReceiveTarget({ ballPos, ballVel }) {
  const lookAhead = AI_SERVE_RECEIVE.lookAhead;
  return {
    x: clamp(ballPos.x + ballVel.x * lookAhead, -3.95, 3.95),
    z: clamp(ballPos.z + ballVel.z * lookAhead - 0.12, -8.65, -2.0)
  };
}
