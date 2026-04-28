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

// The bootstrap super admin (created by `npm run db:seed`). Hidden from the
// admin-panel users list so other admins can't accidentally edit / delete /
// reset-password the root account. The user can still sign in and manage
// the system normally — they just don't appear in the management table.
const SUPER_ADMIN_EMAIL = 'admin@darcafeteria.com';

exports.listUsers = asyncHandler(async (req, res) => {
  const { search, role } = req.query;
  const where = {
    email: { [Op.ne]: SUPER_ADMIN_EMAIL },
  };
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

/**
 * POST /admin/users
 * Body: { fullName, email, password, role?, phone?, address?, avatarSymbol?, isActive? }
 *
 * Lets admins seed a new user directly — used to create staff (riders) so
 * they can sign into the Android app without first registering as a
 * customer and having their role flipped.
 */
exports.createUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, role, phone, address, avatarSymbol, isActive } = req.body;
  if (!fullName || !email || !password) {
    throw ApiError.badRequest('fullName, email and password are required');
  }
  if (password.length < 6) {
    throw ApiError.badRequest('Password must be at least 6 characters');
  }
  const existing = await User.findOne({ where: { email } });
  if (existing) throw ApiError.conflict('A user with this email already exists');

  const user = User.build({
    fullName,
    email,
    role: role || 'customer',
    phone: phone || null,
    address: address || null,
    avatarSymbol: avatarSymbol || 'person.circle.fill',
    isActive: isActive !== false,
  });
  await user.setPassword(password);
  await user.save();

  res.status(201).json({ success: true, data: { user } });
});
