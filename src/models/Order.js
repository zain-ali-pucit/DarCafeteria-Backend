const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// `PickedUp` is the new state set by the staff "Pick Up" action — it sits
// between `Ready` (food made, awaiting rider) and `Delivered` (handed over
// to the customer). The customer is notified at this transition with the
// rider's name + ETA range.
const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Preparing',
  'Ready',
  'PickedUp',
  'Delivered',
  'Cancelled',
];

const Order = sequelize.define(
  'Order',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderNumber: {
      type: DataTypes.STRING(24),
      allowNull: false,
      unique: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...ORDER_STATUSES),
      allowNull: false,
      defaultValue: 'Pending',
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    deliveryFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    placedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    estimatedDelivery: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deliveryAddress: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // ── Rider snapshot, populated when staff hits "Pick Up" ─────────────
    // riderId is the FK to the staff user; the name + phone are
    // denormalised so the customer sees the rider details that were
    // recorded at pickup time even if the rider account changes later.
    riderId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    riderName: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    riderPhone: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    pickedUpAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // ETA is a minute range, e.g. 20–25 min, captured by the rider in the
    // pickup form. Nullable until pickup happens.
    etaMinMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 0, max: 600 },
    },
    etaMaxMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 0, max: 600 },
    },
  },
  {
    tableName: 'orders',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['status'] },
      { fields: ['order_number'] },
      { fields: ['rider_id'] },
    ],
  }
);

Order.STATUSES = ORDER_STATUSES;

module.exports = Order;
