const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Address = sequelize.define(
  'Address',
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
    label: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'Home',
    },
    line: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: 'Qatar',
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: 'addresses',
    indexes: [{ fields: ['user_id'] }],
  }
);

module.exports = Address;
