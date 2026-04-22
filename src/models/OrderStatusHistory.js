const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OrderStatusHistory = sequelize.define(
  'OrderStatusHistory',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    note: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    changedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    tableName: 'order_status_history',
    indexes: [{ fields: ['order_id'] }],
  }
);

module.exports = OrderStatusHistory;
