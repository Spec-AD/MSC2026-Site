'use strict';

let tail = Promise.resolve();

/** Serialize race mutations inside the single server process. */
function withRaceMutationLock(operation) {
  const run = tail.then(operation, operation);
  tail = run.then(() => undefined, () => undefined);
  return run;
}

module.exports = { withRaceMutationLock };
