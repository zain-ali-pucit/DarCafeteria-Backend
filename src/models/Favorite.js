const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Favorite = sequelize.define(
  'Favorite',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    foodItemId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    tableName: 'favorites',
    indexes: [
      { unique: true, fields: ['user_id', 'food_item_id'] },
      { fields: ['user_id'] },
    ],
  }
);

module.exports = Favorite;
