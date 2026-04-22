const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Banner = sequelize.define(
  'Banner',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    taglineKey: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    titleKey: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    subtitleKey: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    gradientColors: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    symbolName: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'banners',
  }
);

module.exports = Banner;
