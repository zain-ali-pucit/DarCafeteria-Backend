const { Category, FoodItem } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const categories = await Category.findAll({ order: [['sort_order', 'ASC']] });
  res.json({ success: true, data: { categories } });
});

exports.create = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);
  res.status(201).json({ success: true, data: { category } });
});

exports.update = asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');

  const oldKey = category.key;
  await category.update(req.body);

  if (req.body.key && req.body.key !== oldKey) {
    await FoodItem.update(
      { categoryKey: req.body.key },
      { where: { categoryKey: oldKey } }
    );
  }

  res.json({ success: true, data: { category } });
});

exports.remove = asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');

  const inUse = await FoodItem.count({ where: { categoryKey: category.key } });
  if (inUse) {
    throw ApiError.badRequest(
      `Cannot delete category: ${inUse} food item(s) still reference it`
    );
  }

  await category.destroy();
  res.json({ success: true, data: { message: 'Category deleted' } });
});
