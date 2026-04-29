const stateMachine = require('./stateMachine');
const qualifier   = require('./qualifier');
const bracket     = require('./bracket');
const seeding     = require('./seeding');
const rewards     = require('./rewards');
const notify      = require('./notify');

module.exports = {
  // stateMachine
  canTransition:       stateMachine.canTransition,
  validateTransition:  stateMachine.validateTransition,
  getRollbackUnset:    stateMachine.getRollbackUnset,
  getRollbackPatch:    stateMachine.getRollbackPatch,

  // qualifier
  calculateQualifierRankings: qualifier.calculateQualifierRankings,
  getQualifiedUserIds:        qualifier.getQualifiedUserIds,

  // bracket
  generateSingleElimination: bracket.generateSingleElimination,
  advanceWinner:             bracket.advanceWinner,
  allMatchesFinished:        bracket.allMatchesFinished,

  // seeding
  snakeSeed:          seeding.snakeSeed,
  nextPowerOfTwo:     seeding.nextPowerOfTwo,
  sortByQualifierRank:seeding.sortByQualifierRank,

  // rewards
  distributeXp: rewards.distributeXp,

  // notify
  notifyStateChange:     notify.notifyStateChange,
  notifyQualifierResult: notify.notifyQualifierResult,
  notifyFinalResults:    notify.notifyFinalResults,
  sendBulkSystemMessage: notify.sendBulkSystemMessage,
};
