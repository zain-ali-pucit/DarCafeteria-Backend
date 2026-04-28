const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { FcmToken, Notification, User } = require('../models');
const firebaseAdmin = require('../services/firebaseAdmin');

/**
 * GET /admin/notifications
 *
 * Recent send history — backs the audit feed in the admin panel.
 */
exports.list = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const notifications = await Notification.findAll({
    order: [['sent_at', 'DESC']],
    limit,
    include: [
      { model: User, as: 'sentBy', attributes: ['id', 'fullName', 'email'] },
    ],
  });
  res.json({ success: true, data: { notifications } });
});

/**
 * GET /admin/fcm-tokens
 *
 * Aggregate counts by platform plus the most recently seen tokens. Useful
 * for the admin to know roughly how many devices are reachable.
 */
exports.tokenStats = asyncHandler(async (req, res) => {
  const [active, total, byPlatform, recent] = await Promise.all([
    FcmToken.count({ where: { isActive: true } }),
    FcmToken.count(),
    FcmToken.findAll({
      attributes: [
        'platform',
        [FcmToken.sequelize.fn('COUNT', FcmToken.sequelize.col('id')), 'count'],
      ],
      where: { isActive: true },
      group: ['platform'],
      raw: true,
    }),
    FcmToken.findAll({
      where: { isActive: true },
      order: [['last_seen_at', 'DESC']],
      limit: 25,
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
      ],
    }),
  ]);

  res.json({
    success: true,
    data: {
      active,
      total,
      byPlatform: byPlatform.reduce((acc, row) => {
        acc[row.platform] = Number(row.count);
        return acc;
      }, {}),
      recent,
    },
  });
});

/**
 * POST /admin/notifications/send
 *
 * Body:
 *   {
 *     target: 'all' | 'user' | 'token' | 'topic',
 *     userId?: UUID,        // when target = 'user'
 *     token?: string,       // when target = 'token'
 *     topic?: string,       // when target = 'topic'
 *     title: string,
 *     body: string,
 *     data?: { [key: string]: any }   // optional FCM data payload
 *   }
 *
 * Returns the persisted notification row plus delivery counts.
 */
exports.send = asyncHandler(async (req, res) => {
  if (!firebaseAdmin.isConfigured()) {
    throw ApiError.badRequest(
      'Firebase Admin SDK is not configured on the server. Set FIREBASE_* env vars.'
    );
  }

  const { target, userId, token, topic, title, body, data } = req.body;

  if (!title || !body) {
    throw ApiError.badRequest('title and body are required');
  }
  if (!['all', 'user', 'token', 'topic'].includes(target)) {
    throw ApiError.badRequest('target must be one of: all | user | token | topic');
  }

  // Resolve recipient list (or topic name) based on the chosen target.
  let tokens = [];
  let resolvedTopic = null;
  let targetValue = null;

  if (target === 'all') {
    const rows = await FcmToken.findAll({
      where: { isActive: true },
      attributes: ['token'],
    });
    tokens = rows.map((r) => r.token);
  } else if (target === 'user') {
    if (!userId) throw ApiError.badRequest('userId is required for target=user');
    targetValue = userId;
    const rows = await FcmToken.findAll({
      where: { userId, isActive: true },
      attributes: ['token'],
    });
    tokens = rows.map((r) => r.token);
  } else if (target === 'token') {
    if (!token) throw ApiError.badRequest('token is required for target=token');
    targetValue = token;
    tokens = [token];
  } else if (target === 'topic') {
    if (!topic) throw ApiError.badRequest('topic is required for target=topic');
    resolvedTopic = topic;
    targetValue = topic;
  }

  // Empty audiences are not an error — they just deliver to nobody.
  let result = { successCount: 0, failureCount: 0, invalidTokens: [] };
  let errorText = null;

  try {
    if (resolvedTopic) {
      result = await firebaseAdmin.sendToTopic(resolvedTopic, { title, body, data });
    } else if (tokens.length > 0) {
      result = await firebaseAdmin.sendToTokens(tokens, { title, body, data });
    }
  } catch (err) {
    errorText = err.message || String(err);
  }

  // Mark invalid tokens inactive so we don't keep targeting them.
  if (result.invalidTokens && result.invalidTokens.length > 0) {
    await FcmToken.update(
      { isActive: false },
      { where: { token: { [Op.in]: result.invalidTokens } } }
    );
  }

  // Persist audit row.
  const notification = await Notification.create({
    title,
    body,
    data: data || null,
    targetType: target,
    targetValue,
    successCount: result.successCount,
    failureCount: result.failureCount,
    error: errorText,
    sentByUserId: req.user ? req.user.id : null,
  });

  if (errorText && result.successCount === 0) {
    // Hard failure — surface the error so the admin sees what went wrong.
    throw ApiError.internal(errorText);
  }

  res.json({
    success: true,
    data: {
      notification,
      delivery: {
        recipients: target === 'topic' ? 'topic' : tokens.length,
        successCount: result.successCount,
        failureCount: result.failureCount,
        invalidTokensRemoved: (result.invalidTokens || []).length,
      },
    },
  });
});
