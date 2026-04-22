const { User, Favorite, FoodItem, Address, Order } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { Op } = require('sequelize');

exports.getProfile = asyncHandler(async (req, res) => {
  const [totalOrders, favoritesCount] = await Promise.all([
    Order.count({ where: { userId: req.user.id, status: 'Delivered' } }),
    Favorite.count({ where: { userId: req.user.id } }),
  ]);

  const spent = await Order.sum('total', {
    where: { userId: req.user.id, status: 'Delivered' },
  });

  res.json({
    success: true,
    data: {
      user: req.user,
      stats: {
        totalOrders,
        totalSpent: Number(spent || 0),
        favoritesCount,
      },
    },
  });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['fullName', 'phone', 'address', 'avatarSymbol'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  await req.user.update(updates);
  res.json({ success: true, data: { user: req.user } });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const ok = await req.user.checkPassword(currentPassword);
  if (!ok) throw ApiError.unauthorized('Current password is incorrect');
  await req.user.setPassword(newPassword);
  await req.user.save();
  res.json({ success: true, data: { message: 'Password updated' } });
});

exports.deleteAccount = asyncHandler(async (req, res) => {
  await req.user.destroy();
  res.json({ success: true, data: { message: 'Account deleted' } });
});

// Favorites

exports.listFavorites = asyncHandler(async (req, res) => {
  const favorites = await Favorite.findAll({
    where: { userId: req.user.id },
    include: [{ model: FoodItem, as: 'foodItem' }],
    order: [['created_at', 'DESC']],
  });
  res.json({
    success: true,
    data: {
      favorites: favorites.map((f) => f.foodItem).filter(Boolean),
    },
  });
});

exports.addFavorite = asyncHandler(async (req, res) => {
  const { foodItemId } = req.params;
  const item = await FoodItem.findByPk(foodItemId);
  if (!item) throw ApiError.notFound('Food item not found');

  const [favorite, created] = await Favorite.findOrCreate({
    where: { userId: req.user.id, foodItemId },
    defaults: { userId: req.user.id, foodItemId },
  });

  res.status(created ? 201 : 200).json({
    success: true,
    data: { favorite, alreadyFavorited: !created },
  });
});

exports.removeFavorite = asyncHandler(async (req, res) => {
  const { foodItemId } = req.params;
  const deleted = await Favorite.destroy({
    where: { userId: req.user.id, foodItemId },
  });
  if (!deleted) throw ApiError.notFound('Favorite not found');
  res.json({ success: true, data: { message: 'Favorite removed' } });
});

// Addresses

exports.listAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.findAll({
    where: { userId: req.user.id },
    order: [['is_default', 'DESC'], ['created_at', 'ASC']],
  });
  res.json({ success: true, data: { addresses } });
});

exports.createAddress = asyncHandler(async (req, res) => {
  const { label, line, city, country, isDefault } = req.body;

  if (isDefault) {
    await Address.update({ isDefault: false }, { where: { userId: req.user.id } });
  }

  const address = await Address.create({
    userId: req.user.id,
    label: label || 'Home',
    line,
    city,
    country: country || 'Qatar',
    isDefault: !!isDefault,
  });
  res.status(201).json({ success: true, data: { address } });
});

exports.updateAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const address = await Address.findOne({ where: { id, userId: req.user.id } });
  if (!address) throw ApiError.notFound('Address not found');

  if (req.body.isDefault) {
    await Address.update(
      { isDefault: false },
      { where: { userId: req.user.id, id: { [Op.ne]: id } } }
    );
  }

  const allowed = ['label', 'line', 'city', 'country', 'isDefault'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  await address.update(updates);
  res.json({ success: true, data: { address } });
});

exports.deleteAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await Address.destroy({ where: { id, userId: req.user.id } });
  if (!deleted) throw ApiError.notFound('Address not found');
  res.json({ success: true, data: { message: 'Address deleted' } });
});
