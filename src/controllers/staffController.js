const { Op } = require('sequelize');
const { Order, OrderItem, OrderStatusHistory, User } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { notifyCustomerPickup } = require('../services/staffNotifications');

// Tab → status set mapping. The staff panel groups orders into 3 columns:
const TAB_STATUS = {
  pending: ['Pending', 'Confirmed', 'Preparing', 'Ready'],
  pickedup: ['PickedUp'],
  completed: ['Delivered', 'Cancelled'],
};

const ORDER_INCLUDE = [
  { model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'phone', 'address'] },
  { model: OrderItem, as: 'items' },
];

/**
 * GET /staff/orders?tab=pending|pickedup|completed
 *
 * Returns up to 200 orders for the requested tab, with full customer +
 * line-item details so the staff panel can render everything in one shot
 * without per-order extra requests. When `tab` is omitted we return all
 * three buckets keyed by tab name — the SPA uses that for its initial
 * load.
 */
exports.listOrders = asyncHandler(async (req, res) => {
  const tab = (req.query.tab || '').toLowerCase();

  if (tab && TAB_STATUS[tab]) {
    const orders = await Order.findAll({
      where: { status: { [Op.in]: TAB_STATUS[tab] } },
      order: [['placed_at', 'DESC']],
      limit: 200,
      include: ORDER_INCLUDE,
    });
    return res.json({ success: true, data: { tab, orders } });
  }

  // No tab specified — return all three.
  const [pending, pickedup, completed] = await Promise.all(
    Object.keys(TAB_STATUS).map((t) =>
      Order.findAll({
        where: { status: { [Op.in]: TAB_STATUS[t] } },
        order: [['placed_at', 'DESC']],
        limit: 100,
        include: ORDER_INCLUDE,
      })
    )
  );

  res.json({
    success: true,
    data: { tabs: { pending, pickedup, completed } },
  });
});

/**
 * GET /staff/orders/:id — fetch a single order with full detail. Useful
 * after a deep-link from a notification tap.
 */
exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id, { include: ORDER_INCLUDE });
  if (!order) throw ApiError.notFound('Order not found');
  res.json({ success: true, data: { order } });
});

/**
 * POST /staff/orders/:id/pickup
 * Body: { etaMinMinutes, etaMaxMinutes, riderName?, riderPhone? }
 *
 * Marks the order as picked up by the calling staff/admin user. Saves a
 * snapshot of the rider's name + phone (defaulting to req.user) and the
 * ETA range, then dispatches an FCM push to the customer.
 */
exports.pickUp = asyncHandler(async (req, res) => {
  const { etaMinMinutes, etaMaxMinutes, riderName, riderPhone } = req.body;

  if (
    !Number.isInteger(etaMinMinutes) ||
    !Number.isInteger(etaMaxMinutes) ||
    etaMinMinutes < 0 ||
    etaMaxMinutes < 0 ||
    etaMaxMinutes < etaMinMinutes
  ) {
    throw ApiError.badRequest('etaMinMinutes and etaMaxMinutes must form a valid minute range');
  }

  const order = await Order.findByPk(req.params.id, { include: ORDER_INCLUDE });
  if (!order) throw ApiError.notFound('Order not found');

  if (['Delivered', 'Cancelled'].includes(order.status)) {
    throw ApiError.badRequest(`Cannot pick up an order that is already ${order.status}`);
  }

  const previousStatus = order.status;
  await order.update({
    status: 'PickedUp',
    riderId: req.user.id,
    riderName: riderName || req.user.fullName,
    riderPhone: riderPhone || req.user.phone || null,
    pickedUpAt: new Date(),
    etaMinMinutes,
    etaMaxMinutes,
    estimatedDelivery: new Date(Date.now() + etaMaxMinutes * 60 * 1000),
  });

  await OrderStatusHistory.create({
    orderId: order.id,
    status: 'PickedUp',
    note: `Picked up by ${order.riderName} from ${previousStatus} (ETA ${etaMinMinutes}–${etaMaxMinutes} min)`,
    changedBy: req.user.id,
  });

  // Fire-and-forget push to the customer.
  notifyCustomerPickup(order).catch(() => {});

  res.json({ success: true, data: { order } });
});

/**
 * POST /staff/orders/:id/complete — flips status to Delivered.
 */
exports.complete = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id, { include: ORDER_INCLUDE });
  if (!order) throw ApiError.notFound('Order not found');
  if (order.status === 'Delivered') {
    return res.json({ success: true, data: { order } });
  }

  const previousStatus = order.status;
  await order.update({ status: 'Delivered' });
  await OrderStatusHistory.create({
    orderId: order.id,
    status: 'Delivered',
    note: `Delivered (from ${previousStatus})`,
    changedBy: req.user.id,
  });

  res.json({ success: true, data: { order } });
});

/**
 * POST /staff/orders/:id/cancel — staff-side cancellation (e.g. address
 * unreachable). Records the optional note in OrderStatusHistory.
 */
exports.cancel = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id, { include: ORDER_INCLUDE });
  if (!order) throw ApiError.notFound('Order not found');
  if (order.status === 'Cancelled' || order.status === 'Delivered') {
    throw ApiError.badRequest(`Order is already ${order.status}`);
  }
  const previousStatus = order.status;
  await order.update({ status: 'Cancelled' });
  await OrderStatusHistory.create({
    orderId: order.id,
    status: 'Cancelled',
    note: req.body.note || `Cancelled by staff (from ${previousStatus})`,
    changedBy: req.user.id,
  });
  res.json({ success: true, data: { order } });
});
