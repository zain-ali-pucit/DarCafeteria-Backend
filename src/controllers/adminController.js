const { Op } = require('sequelize');
const {
  sequelize,
  User,
  FoodItem,
  Order,
  OrderItem,
  Category,
  Banner,
  Favorite,
} = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.stats = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    userCount,
    customerCount,
    foodCount,
    availableFoodCount,
    orderCount,
    activeOrderCount,
    deliveredOrderCount,
    ordersLastWeek,
    totalRevenue,
    revenueLastWeek,
    topFoods,
  ] = await Promise.all([
    User.count(),
    User.count({ where: { role: 'customer' } }),
    FoodItem.count(),
    FoodItem.count({ where: { isAvailable: true } }),
    Order.count(),
    Order.count({ where: { status: ['Pending', 'Confirmed', 'Preparing', 'Ready'] } }),
    Order.count({ where: { status: 'Delivered' } }),
    Order.count({ where: { placedAt: { [Op.gte]: since } } }),
    Order.sum('total', { where: { status: 'Delivered' } }),
    Order.sum('total', {
      where: { status: 'Delivered', placedAt: { [Op.gte]: since } },
    }),
    OrderItem.findAll({
      attributes: [
        'foodItemId',
        'nameSnapshot',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'sold'],
      ],
      group: ['foodItemId', 'nameSnapshot'],
      order: [[sequelize.literal('sold'), 'DESC']],
      limit: 5,
      raw: true,
    }),
  ]);

  const recentOrders = await Order.findAll({
    order: [['placed_at', 'DESC']],
    limit: 8,
    include: [
      { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
    ],
  });

  res.json({
    success: true,
    data: {
      users: { total: userCount, customers: customerCount },
      foods: { total: foodCount, available: availableFoodCount },
      orders: {
        total: orderCount,
        active: activeOrderCount,
        delivered: deliveredOrderCount,
        lastWeek: ordersLastWeek,
      },
      revenue: {
        total: Number(totalRevenue || 0),
        lastWeek: Number(revenueLastWeek || 0),
      },
      topFoods: topFoods.map((t) => ({
        foodItemId: t.foodItemId,
        name: t.nameSnapshot,
        sold: Number(t.sold),
      })),
      recentOrders,
    },
  });
});

// --- Users

exports.listUsers = asyncHandler(async (req, res) => {
  const { search, role } = req.query;
  const where = {};
  if (role) where.role = role;
  if (search) {
    const term = `%${search}%`;
    where[Op.or] = [
      { fullName: { [Op.iLike]: term } },
      { email: { [Op.iLike]: term } },
      { phone: { [Op.iLike]: term } },
    ];
  }
  const users = await User.findAll({
    where,
    order: [['created_at', 'DESC']],
    limit: 200,
  });
  res.json({ success: true, data: { users } });
});

exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id, {
    include: [
      { model: Order, as: 'orders', limit: 20, order: [['placed_at', 'DESC']] },
    ],
  });
  if (!user) throw ApiError.notFound('User not found');

  const [totalOrders, favoritesCount, spent] = await Promise.all([
    Order.count({ where: { userId: user.id } }),
    Favorite.count({ where: { userId: user.id } }),
    Order.sum('total', { where: { userId: user.id, status: 'Delivered' } }),
  ]);

  res.json({
    success: true,
    data: {
      user,
      stats: {
        totalOrders,
        favoritesCount,
        totalSpent: Number(spent || 0),
      },
    },
  });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  const allowed = ['fullName', 'phone', 'address', 'role', 'isActive', 'avatarSymbol'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  // Block de-activating / de-privileging yourself to avoid lockouts.
  if (user.id === req.user.id) {
    delete updates.isActive;
    delete updates.role;
  }

  await user.update(updates);
  res.json({ success: true, data: { user } });
});

exports.resetUserPassword = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    throw ApiError.badRequest('newPassword must be at least 6 characters');
  }
  await user.setPassword(newPassword);
  await user.save();
  res.json({ success: true, data: { message: 'Password reset' } });
});

exports.deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    throw ApiError.badRequest('You cannot delete your own account from here');
  }
  const user = await User.findByPk(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  await user.destroy();
  res.json({ success: true, data: { message: 'User deleted' } });
});
