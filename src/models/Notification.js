const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Audit row for every push send dispatched from the admin panel.
 *
 * `targetType` says how the admin selected recipients — "all", a specific
 * "user", a specific "token", or a "topic". `targetValue` carries the
 * concrete identifier (userId / token / topic name); it's null for "all".
 *
 * `successCount` / `failureCount` are populated from the FCM batch response
 * so the admin can see at a glance how many devices actually got the push.
 */
const Notification = sequelize.define(
  'Notification',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    targetType: {
      type: DataTypes.ENUM('all', 'user', 'token', 'topic'),
      allowNull: false,
    },
    targetValue: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    successCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    failureCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sentByUserId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'notifications',
    indexes: [
      { fields: ['target_type'] },
      { fields: ['sent_at'] },
    ],
  }
);

module.exports = Notification;
