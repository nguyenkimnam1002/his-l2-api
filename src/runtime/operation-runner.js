const { AppError } = require('../shared/app-error');

async function runOperation(operation, context) {
  if (operation.definition.status !== 'Đang hoạt động') {
    throw new AppError(
      operation.definition.status === 'Đã hủy' ? 'OPERATION_CANCELLED' : 'OPERATION_PAUSED',
      `Operation ${operation.definition.id} không hoạt động`,
      operation.definition.status === 'Đã hủy' ? 410 : 503
    );
  }

  const result = await operation.execute(context);
  const delivery = operation.definition.delivery || { type: 'none' };

  if (delivery.type === 'http-response' || delivery.type === 'none') return result;
  if (delivery.type === 'rest-push') {
    const target = context.outboundTargets?.[delivery.target];
    if (!target) {
      throw new AppError(
        'OUTBOUND_TARGET_MISSING',
        `Chưa cấu hình outbound target: ${delivery.target}`,
        500
      );
    }
    return context.restPushClient.push(target, result.data ?? result);
  }

  throw new AppError('DELIVERY_NOT_SUPPORTED', `Delivery không hỗ trợ: ${delivery.type}`, 500);
}

module.exports = { runOperation };
