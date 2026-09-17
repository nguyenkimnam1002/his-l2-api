// Compatibility facade. New code should import from ./registry/operations.
const { operations, getOperation, toPublicApi } = require('./registry/operations');

const apiCatalog = operations.map(toPublicApi);

function getApiById(id) {
  const { definition } = getOperation(id);
  return {
    ...toPublicApi({ definition }),
    ctlSql: definition.execution?.ctlSql,
    trigger: definition.trigger,
    execution: definition.execution,
    delivery: definition.delivery
  };
}

module.exports = { apiCatalog, getApiById };
