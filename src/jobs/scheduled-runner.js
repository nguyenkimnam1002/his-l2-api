const { getOperation } = require('../registry/operations');
const { runOperation } = require('../runtime/operation-runner');

async function runScheduledOperation(operationId, context) {
  const operation = getOperation(operationId);
  if (operation.definition.trigger?.type !== 'schedule') {
    throw new Error(`${operationId} không phải scheduled operation`);
  }
  return runOperation(operation, context);
}

module.exports = { runScheduledOperation };
