const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { FcmToken } = require('../models');

/**
 * POST /users/fcm-token
 *
 * Authenticated. The Android / iOS clients call this every time Firebase
 * issues them a new device token (or whenever the app cold-starts and the
 * cached token has changed). Behaviour:
 *
 *   - If we already have a row for this token, update its userId,
 *     platform, lastSeenAt and reactivate it.
 *   - Otherwise insert a fresh row.
 *
 * The same token can therefore migrate cleanly between accounts on a
 * shared device without creating duplicates.
 */
exports.registerToken = asyncHandler(async (req, res) => {
  const { token, platform, appVersion } = req.body;
  if (!token || typeof token !== 'string' || token.length < 32) {
    throw ApiError.badRequest('A valid FCM token is required');
  }

  const normalizedPlatform = ['android', 'ios', 'web'].includes(platform)
    ? platform
    : 'android';

  const [row, created] = await FcmToken.findOrCreate({
    where: { token },
    defaults: {
      token,
      userId: req.user.id,
      platform: normalizedPlatform,
      appVersion: appVersion || null,
      isActive: true,
      lastSeenAt: new Date(),
    },
  });

  if (!created) {
    await row.update({
      userId: req.user.id,
      platform: normalizedPlatform,
      appVersion: appVersion || row.appVersion,
      isActive: true,
      lastSeenAt: new Date(),
    });
  }

  res.json({
    success: true,
    data: { id: row.id, registered: true, created },
  });
});

/**
 * DELETE /users/fcm-token
 *
 * Used on sign-out to stop pushes from reaching this device for the
 * previous user. Body: { token }.
 */
exports.unregisterToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw ApiError.badRequest('Token is required');
  await FcmToken.update(
    { isActive: false },
    { where: { token, userId: req.user.id } }
  );
  res.json({ success: true, data: { unregistered: true } });
});
