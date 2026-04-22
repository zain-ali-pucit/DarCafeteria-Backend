const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FoodItem = sequelize.define(
  'FoodItem',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    nameAr: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    descriptionAr: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    chefName: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    chefNameAr: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    chefAvatarSymbol: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
    },
    categoryKey: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    rating: {
      type: DataTypes.DECIMAL(2, 1),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 5 },
    },
    reviewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    prepTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
    },
    servings: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    ingredients: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    ingredientsAr: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    tags: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    tagsAr: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    isPopular: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isChefSpecial: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isAvailable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
  },
  {
    tableName: 'food_items',
    indexes: [
      { fields: ['category_key'] },
      { fields: ['is_popular'] },
      { fields: ['is_chef_special'] },
      { fields: ['is_available'] },
    ],
  }
);

module.exports = FoodItem;
