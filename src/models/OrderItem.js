const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OrderItem = sequelize.define(
  'OrderItem',
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
    foodItemId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    nameSnapshot: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    nameArSnapshot: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    priceSnapshot: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: { min: 1 },
    },
    specialNote: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    tableName: 'order_items',
    indexes: [{ fields: ['order_id'] }, { fields: ['food_item_id'] }],
  }
);

module.exports = OrderItem;
