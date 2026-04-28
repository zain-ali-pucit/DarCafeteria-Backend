const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * One row per device per user.
 *
 * The `token` is unique across the whole table — Firebase guarantees a
 * single token per app install, so if the same token shows up under a new
 * user (e.g. account switch on the same device) we update the existing row
 * to point at the new user instead of creating a duplicate.
 *
 * `isActive` is flipped to false when Firebase reports the token as invalid
 * (e.g. uninstall, refresh) so we stop targeting it without losing audit
 * trail.
 */
const FcmToken = sequelize.define(
  'FcmToken',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true, // null for guest devices
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    platform: {
      type: DataTypes.ENUM('android', 'ios', 'web'),
      allowNull: false,
      defaultValue: 'android',
    },
    appVersion: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    lastSeenAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'fcm_tokens',
    indexes: [
      { unique: true, fields: ['token'] },
      { fields: ['user_id'] },
      { fields: ['is_active'] },
    ],
  }
);

module.exports = FcmToken;
