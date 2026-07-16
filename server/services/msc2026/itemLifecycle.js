'use strict';

function getGlobalEffectTurnRange(currentTurn, durationRounds, playerCount) {
  if (!Number.isInteger(currentTurn) || currentTurn < 0) throw new Error('当前回合非法');
  if (!Number.isInteger(durationRounds) || durationRounds < 1) throw new Error('持续轮数非法');
  if (!Number.isInteger(playerCount) || playerCount < 1) throw new Error('选手人数非法');
  const durationTurns = durationRounds * playerCount;
  return {
    startsAtTurn: currentTurn,
    endsAtTurn: currentTurn + durationTurns - 1,
    durationTurns
  };
}

module.exports = { getGlobalEffectTurnRange };
