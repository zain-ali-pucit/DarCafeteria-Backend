const { Banner } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const banners = await Banner.findAll({
    where: { isActive: true },
    order: [['sort_order', 'ASC']],
  });
  res.json({ success: true, data: { banners } });
});

exports.listAll = asyncHandler(async (req, res) => {
  const banners = await Banner.findAll({ order: [['sort_order', 'ASC']] });
  res.json({ success: true, data: { banners } });
});

exports.create = asyncHandler(async (req, res) => {
  const banner = await Banner.create(req.body);
  res.status(201).json({ success: true, data: { banner } });
});

exports.update = asyncHandler(async (req, res) => {
  const banner = await Banner.findByPk(req.params.id);
  if (!banner) throw ApiError.notFound('Banner not found');
  await banner.update(req.body);
  res.json({ success: true, data: { banner } });
});

exports.remove = asyncHandler(async (req, res) => {
  const banner = await Banner.findByPk(req.params.id);
  if (!banner) throw ApiError.notFound('Banner not found');
  await banner.destroy();
  res.json({ success: true, data: { message: 'Banner deleted' } });
});
