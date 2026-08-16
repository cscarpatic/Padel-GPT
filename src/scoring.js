export const pointLabel = (mine, theirs) => {
  if (mine >= 3 && theirs >= 3) {
    if (mine === theirs) return '40';
    return mine > theirs ? 'AD' : '40';
  }
  return String([0, 15, 30, 40][Math.min(mine, 3)]);
};

export class MatchScore {
  constructor() {
    this.reset();
  }

  reset() {
    this.points = { player: 0, ai: 0 };
    this.games = { player: 0, ai: 0 };
    this.tieBreak = false;
    this.finished = false;
    this.winner = null;
    this.totalPoints = 0;
    this.gameNumber = 0;
  }

  point(side) {
    if (this.finished) return { type: 'none' };
    this.totalPoints += 1;
    this.points[side] += 1;

    if (this.tieBreak) {
      const other = side === 'player' ? 'ai' : 'player';
      if (this.points[side] >= 7 && this.points[side] - this.points[other] >= 2) {
        this.games[side] += 1;
        return this.#finishSet(side, true);
      }
      return { type: 'point', side, tieBreak: true };
    }

    const other = side === 'player' ? 'ai' : 'player';
    if (this.points[side] >= 4 && this.points[side] - this.points[other] >= 2) {
      this.games[side] += 1;
      this.gameNumber += 1;
      this.points.player = 0;
      this.points.ai = 0;

      if (this.games[side] >= 6 && this.games[side] - this.games[other] >= 2) {
        return this.#finishSet(side, false);
      }
      if (this.games.player === 6 && this.games.ai === 6) {
        this.tieBreak = true;
        return { type: 'game', side, tieBreakStarted: true };
      }
      return { type: 'game', side };
    }

    return { type: 'point', side, tieBreak: false };
  }

  #finishSet(side, tieBreak) {
    this.finished = true;
    this.winner = side;
    this.points.player = 0;
    this.points.ai = 0;
    return { type: 'set', side, tieBreak };
  }

  display() {
    return {
      playerPoint: this.tieBreak ? String(this.points.player) : pointLabel(this.points.player, this.points.ai),
      aiPoint: this.tieBreak ? String(this.points.ai) : pointLabel(this.points.ai, this.points.player),
      playerGames: this.games.player,
      aiGames: this.games.ai,
      tieBreak: this.tieBreak,
      finished: this.finished,
      winner: this.winner
    };
  }
}
