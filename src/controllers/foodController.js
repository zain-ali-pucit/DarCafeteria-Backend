const { Op } = require('sequelize');
const { FoodItem, Favorite } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

function parsePagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

async function attachFavoriteFlag(items, userId) {
  if (!userId || !items.length) {
    return items.map((it) => ({ ...it.toJSON(), isFavorited: false }));
  }
  const favorites = await Favorite.findAll({
    where: { userId, foodItemId: items.map((it) => it.id) },
    attributes: ['foodItemId'],
  });
  const favSet = new Set(favorites.map((f) => f.foodItemId));
  return items.map((it) => ({ ...it.toJSON(), isFavorited: favSet.has(it.id) }));
}

exports.list = asyncHandler(async (req, res) => {
  const { category, search, popular, chefSpecial } = req.query;
  const { page, limit, offset } = parsePagination(req.query);

  const where = {};
  // Public callers only see available items. Admins can opt out of that
  // filter by passing ?includeUnavailable=true so they can re-enable
  // items they've previously hidden.
  const adminWantsAll =
    req.query.includeUnavailable === 'true' && req.user && req.user.role === 'admin';
  if (!adminWantsAll) where.isAvailable = true;
  if (category && category.toLowerCase() !== 'all') where.categoryKey = category;
  if (popular === 'true') where.isPopular = true;
  if (chefSpecial === 'true') where.isChefSpecial = true;
  if (search) {
    const term = `%${search}%`;
    where[Op.or] = [
      { name: { [Op.iLike]: term } },
      { nameAr: { [Op.iLike]: term } },
      { description: { [Op.iLike]: term } },
      { descriptionAr: { [Op.iLike]: term } },
      { chefName: { [Op.iLike]: term } },
      { chefNameAr: { [Op.iLike]: term } },
    ];
  }

  const { rows, count } = await FoodItem.findAndCountAll({
    where,
    order: [['is_popular', 'DESC'], ['rating', 'DESC'], ['name', 'ASC']],
    limit,
    offset,
  });

  const data = await attachFavoriteFlag(rows, req.user?.id);
  res.json({
    success: true,
    data: {
      items: data,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    },
  });
});

exports.getOne = asyncHandler(async (req, res) => {
  const item = await FoodItem.findByPk(req.params.id);
  if (!item) throw ApiError.notFound('Food item not found');
  const [decorated] = await attachFavoriteFlag([item], req.user?.id);
  res.json({ success: true, data: { item: decorated } });
});

exports.popular = asyncHandler(async (req, res) => {
  const items = await FoodItem.findAll({
    where: { isAvailable: true, isPopular: true },
    order: [['rating', 'DESC']],
    limit: 10,
  });
  const data = await attachFavoriteFlag(items, req.user?.id);
  res.json({ success: true, data: { items: data } });
});

exports.chefSpecials = asyncHandler(async (req, res) => {
  const items = await FoodItem.findAll({
    where: { isAvailable: true, isChefSpecial: true },
    order: [['rating', 'DESC']],
    limit: 10,
  });
  const data = await attachFavoriteFlag(items, req.user?.id);
  res.json({ success: true, data: { items: data } });
});

exports.search = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) throw ApiError.badRequest('Missing search query parameter "q"');
  const term = `%${q}%`;
  const items = await FoodItem.findAll({
    where: {
      isAvailable: true,
      [Op.or]: [
        { name: { [Op.iLike]: term } },
        { nameAr: { [Op.iLike]: term } },
        { description: { [Op.iLike]: term } },
        { descriptionAr: { [Op.iLike]: term } },
        { chefName: { [Op.iLike]: term } },
      ],
    },
    limit: 30,
  });
  const data = await attachFavoriteFlag(items, req.user?.id);
  res.json({ success: true, data: { items: data } });
});

// Every dish is "by Dar" — there's only one chef in the brand. We force
// these values on every write so the data stays clean even if a client
// (or seed script) sends something else.
const CHEF_NAME_EN = 'Dar';
const CHEF_NAME_AR = 'دار';

exports.create = asyncHandler(async (req, res) => {
  const item = await FoodItem.create({
    ...req.body,
    chefName: CHEF_NAME_EN,
    chefNameAr: CHEF_NAME_AR,
  });
  res.status(201).json({ success: true, data: { item } });
});

exports.update = asyncHandler(async (req, res) => {
  const item = await FoodItem.findByPk(req.params.id);
  if (!item) throw ApiError.notFound('Food item not found');
  // Strip any chef overrides — they're always "Dar".
  const payload = { ...req.body };
  delete payload.chefName;
  delete payload.chefNameAr;
  await item.update(payload);
  res.json({ success: true, data: { item } });
});

exports.remove = asyncHandler(async (req, res) => {
  const item = await FoodItem.findByPk(req.params.id);
  if (!item) throw ApiError.notFound('Food item not found');
  await item.destroy();
  res.json({ success: true, data: { message: 'Food item deleted' } });
});
