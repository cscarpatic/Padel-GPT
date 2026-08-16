export const DIFFICULTY = {
  beginner: { speed: 2.6, reaction: 0.62, accuracy: 2.6, power: 0.72, assist: 0.52, aiReach: 1.3, label: 'BEGINNER' },
  rookie: { speed: 3.2, reaction: 0.46, accuracy: 2.25, power: 0.80, assist: 0.36, aiReach: 1.48, label: 'ROOKIE' },
  pro: { speed: 4.2, reaction: 0.28, accuracy: 1.5, power: 0.90, assist: 0.20, aiReach: 1.75, label: 'PRO' },
  elite: { speed: 5.2, reaction: 0.16, accuracy: 0.8, power: 1.00, assist: 0.08, aiReach: 2.0, label: 'ELITE' }
};

export const PLAYER_TUNING = {
  speed: 9.2,
  touchBoost: 1.25,
  sprintBoost: 1.14,
  acceleration: 28,
  hitReach: 2.15,
  maxHitHeight: 3.35,
  assistRange: 4.3
};

export function joystickCurve(value) {
  const n = Math.max(0, Math.min(1, value));
  const deadZone = 0.035;
  if (n <= deadZone) return 0;
  const t = (n - deadZone) / (1 - deadZone);
  return Math.min(1, 0.24 * Math.sqrt(t) + 0.76 * t);
}
