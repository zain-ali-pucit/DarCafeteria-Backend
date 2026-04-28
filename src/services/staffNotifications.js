/**
 * Higher-level wrappers around firebaseAdmin for the order workflow:
 *
 *   • notifyStaffNewOrder(order)  — fan-out to every active staff/admin
 *     device when a customer places an order.
 *   • notifyCustomerPickup(order) — direct push to the customer with the
 *     rider name + ETA range as soon as staff hits "Pick up".
 *
 * Both helpers are best-effort: they swallow any failure, log it, and
 * persist a Notification audit row so the admin panel's "recent sends"
 * feed shows them. The order workflow never blocks on push delivery.
 */

const { Op } = require('sequelize');
const { FcmToken, Notification, User } = require('../models');
const firebaseAdmin = require('./firebaseAdmin');

async function dispatch({ tokens, content, audit }) {
  if (!firebaseAdmin.isConfigured()) {
    // Skip silently when Firebase isn't set up — the rest of the workflow
    // shouldn't break locally just because admins haven't configured FCM.
    return { successCount: 0, failureCount: 0, skipped: true };
  }

  let result = { successCount: 0, failureCount: 0, invalidTokens: [] };
  let errorText = null;

  try {
    if (tokens.length > 0) {
      result = await firebaseAdmin.sendToTokens(tokens, content);
    }
  } catch (err) {
    errorText = err.message || String(err);
    // eslint-disable-next-line no-console
    console.warn('[staffNotifications] dispatch failed:', errorText);
  }

  if (result.invalidTokens && result.invalidTokens.length > 0) {
    await FcmToken.update(
      { isActive: false },
      { where: { token: { [Op.in]: result.invalidTokens } } }
    );
  }

  // Audit row — surfaces in /admin/notifications history.
  if (audit) {
    await Notification.create({
      title: content.title,
      body: content.body,
      data: content.data || null,
      targetType: audit.targetType,
      targetValue: audit.targetValue,
      successCount: result.successCount,
      failureCount: result.failureCount,
      error: errorText,
      sentByUserId: null, // system-generated
    });
  }

  return result;
}

/**
 * Push to every active staff + admin device when a new order is placed.
 * The Android customer app re-uses the same FCM token registration, so
 * an admin who's also signed in on the customer app gets pinged too —
 * that's intentional (it's the same person).
 */
async function notifyStaffNewOrder(order, customer) {
  // Find every active token tied to a staff/admin user.
  const rows = await FcmToken.findAll({
    where: { isActive: true },
    include: [
      {
        model: User,
        as: 'user',
        required: true,
        where: { role: { [Op.in]: ['staff', 'admin'] } },
        attributes: ['id'],
      },
    ],
    attributes: ['token'],
  });
  const tokens = rows.map((r) => r.token);

  const customerLabel = customer && customer.fullName ? customer.fullName : 'A customer';
  const itemCount = (order.items && order.items.length) || 0;

  return dispatch({
    tokens,
    content: {
      title: `New order — ${order.orderNumber}`,
      body: `${customerLabel} ordered ${itemCount} item${itemCount === 1 ? '' : 's'} (QAR ${Number(order.total).toFixed(0)}).`,
      data: {
        type: 'new_order',
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    },
    audit: { targetType: 'all', targetValue: 'role:staff' },
  });
}

/**
 * Push to the customer who placed `order` saying their order has been
 * picked up. The body includes the rider name + ETA range so it's
 * actionable without opening the app.
 */
async function notifyCustomerPickup(order) {
  // Pull the customer's active tokens.
  const rows = await FcmToken.findAll({
    where: { userId: order.userId, isActive: true },
    attributes: ['token'],
  });
  const tokens = rows.map((r) => r.token);

  const riderName = order.riderName || 'Our rider';
  const etaRange =
    order.etaMinMinutes != null && order.etaMaxMinutes != null
      ? `${order.etaMinMinutes}–${order.etaMaxMinutes} min`
      : null;

  const body = etaRange
    ? `Picked up by ${riderName}. Arriving in ${etaRange}.`
    : `Picked up by ${riderName}. On the way to you.`;

  return dispatch({
    tokens,
    content: {
      title: 'Your order is on its way!',
      body,
      data: {
        type: 'order_picked_up',
        orderId: order.id,
        orderNumber: order.orderNumber,
        riderName,
        riderPhone: order.riderPhone || '',
        etaMinMinutes: order.etaMinMinutes != null ? String(order.etaMinMinutes) : '',
        etaMaxMinutes: order.etaMaxMinutes != null ? String(order.etaMaxMinutes) : '',
      },
    },
    audit: { targetType: 'user', targetValue: order.userId },
  });
}

module.exports = {
  notifyStaffNewOrder,
  notifyCustomerPickup,
};
