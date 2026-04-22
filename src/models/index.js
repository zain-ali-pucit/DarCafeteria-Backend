const { sequelize } = require('../config/database');

const User = require('./User');
const Category = require('./Category');
const FoodItem = require('./FoodItem');
const Favorite = require('./Favorite');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const OrderStatusHistory = require('./OrderStatusHistory');
const Banner = require('./Banner');
const Address = require('./Address');

// Associations
User.hasMany(Favorite, { foreignKey: 'userId', as: 'favorites', onDelete: 'CASCADE' });
Favorite.belongsTo(User, { foreignKey: 'userId' });

FoodItem.hasMany(Favorite, { foreignKey: 'foodItemId', as: 'favorites', onDelete: 'CASCADE' });
Favorite.belongsTo(FoodItem, { foreignKey: 'foodItemId', as: 'foodItem' });

User.belongsToMany(FoodItem, {
  through: Favorite,
  foreignKey: 'userId',
  otherKey: 'foodItemId',
  as: 'favoriteFoods',
});
FoodItem.belongsToMany(User, {
  through: Favorite,
  foreignKey: 'foodItemId',
  otherKey: 'userId',
  as: 'favoritedBy',
});

User.hasMany(Order, { foreignKey: 'userId', as: 'orders', onDelete: 'CASCADE' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

FoodItem.hasMany(OrderItem, { foreignKey: 'foodItemId' });
OrderItem.belongsTo(FoodItem, { foreignKey: 'foodItemId', as: 'foodItem' });

Order.hasMany(OrderStatusHistory, {
  foreignKey: 'orderId',
  as: 'statusHistory',
  onDelete: 'CASCADE',
});
OrderStatusHistory.belongsTo(Order, { foreignKey: 'orderId' });

User.hasMany(Address, { foreignKey: 'userId', as: 'addresses', onDelete: 'CASCADE' });
Address.belongsTo(User, { foreignKey: 'userId' });

Category.hasMany(FoodItem, {
  foreignKey: 'categoryKey',
  sourceKey: 'key',
  as: 'foodItems',
});
FoodItem.belongsTo(Category, {
  foreignKey: 'categoryKey',
  targetKey: 'key',
  as: 'category',
});

module.exports = {
  sequelize,
  User,
  Category,
  FoodItem,
  Favorite,
  Order,
  OrderItem,
  OrderStatusHistory,
  Banner,
  Address,
};
