const {
  sequelize,
  Order,
  OrderItem,
  OrderStatusHistory,
  FoodItem,
} = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { computeDeliveryFee, toMoney } = require('../utils/pricing');
const { generateOrderNumber } = require('../utils/orderNumber');

const ACTIVE_STATUSES = ['Pending', 'Confirmed', 'Preparing', 'Ready'];
const TERMINAL_STATUSES = ['Delivered', 'Cancelled'];

function includeItems() {
  return [
    { model: OrderItem, as: 'items', include: [{ model: FoodItem, as: 'foodItem' }] },
    { model: OrderStatusHistory, as: 'statusHistory' },
  ];
}

exports.create = asyncHandler(async (req, res) => {
  const { items, deliveryAddress, notes } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw ApiError.badRequest('Cart is empty');
  }

  const foodIds = items.map((it) => it.foodItemId);
  const foods = await FoodItem.findAll({ where: { id: foodIds, isAvailable: true } });
  if (foods.length !== new Set(foodIds).size) {
    throw ApiError.badRequest('One or more items are unavailable');
  }
  const foodMap = new Map(foods.map((f) => [f.id, f]));

  const orderItemRows = items.map((it) => {
    const food = foodMap.get(it.foodItemId);
    if (!food) throw ApiError.badRequest(`Food ${it.foodItemId} not found`);
    const qty = Math.max(parseInt(it.quantity, 10) || 1, 1);
    const priceSnapshot = Number(food.price);
    const subtotal = toMoney(priceSnapshot * qty);
    return {
      foodItemId: food.id,
      nameSnapshot: food.name,
      nameArSnapshot: food.nameAr,
      priceSnapshot,
      quantity: qty,
      specialNote: it.specialNote || null,
      subtotal,
    };
  });

  const subtotal = toMoney(orderItemRows.reduce((sum, it) => sum + Number(it.subtotal), 0));
  const deliveryFee = computeDeliveryFee(subtotal);
  const total = toMoney(subtotal + deliveryFee);

  const finalDeliveryAddress = deliveryAddress || req.user.address;
  if (!finalDeliveryAddress) {
    throw ApiError.badRequest('Delivery address is required');
  }

  const order = await sequelize.transaction(async (t) => {
    const created = await Order.create(
      {
        orderNumber: generateOrderNumber(),
        userId: req.user.id,
        status: 'Pending',
        subtotal,
        deliveryFee,
        total,
        placedAt: new Date(),
        estimatedDelivery: new Date(Date.now() + 45 * 60 * 1000),
        deliveryAddress: finalDeliveryAddress,
        notes: notes || null,
      },
      { transaction: t }
    );

    await OrderItem.bulkCreate(
      orderItemRows.map((row) => ({ ...row, orderId: created.id })),
      { transaction: t }
    );

    await OrderStatusHistory.create(
      { orderId: created.id, status: 'Pending', note: 'Order placed' },
      { transaction: t }
    );

    return created;
  });

  const full = await Order.findByPk(order.id, { include: includeItems() });
  res.status(201).json({ success: true, data: { order: full } });
});

exports.listMine = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const where = { userId: req.user.id };

  if (status === 'active') where.status = ACTIVE_STATUSES;
  else if (status === 'history') where.status = TERMINAL_STATUSES;
  else if (status && Order.STATUSES.includes(status)) where.status = status;

  const orders = await Order.findAll({
    where,
    include: includeItems(),
    order: [['placed_at', 'DESC']],
  });
  res.json({ success: true, data: { orders } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    where: { id: req.params.id },
    include: includeItems(),
  });
  if (!order) throw ApiError.notFound('Order not found');
  if (order.userId !== req.user.id && req.user.role !== 'admin') {
    throw ApiError.forbidden();
  }
  res.json({ success: true, data: { order } });
});

exports.active = asyncHandler(async (req, res) => {
  const orders = await Order.findAll({
    where: { userId: req.user.id, status: ACTIVE_STATUSES },
    include: includeItems(),
    order: [['placed_at', 'DESC']],
  });
  res.json({ success: true, data: { orders } });
});

exports.history = asyncHandler(async (req, res) => {
  const orders = await Order.findAll({
    where: { userId: req.user.id, status: TERMINAL_STATUSES },
    include: includeItems(),
    order: [['placed_at', 'DESC']],
  });
  res.json({ success: true, data: { orders } });
});

exports.cancel = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!order) throw ApiError.notFound('Order not found');
  if (!ACTIVE_STATUSES.includes(order.status)) {
    throw ApiError.badRequest(`Cannot cancel order in status ${order.status}`);
  }
  if (order.status !== 'Pending') {
    throw ApiError.badRequest('Order can only be cancelled while still Pending');
  }

  await sequelize.transaction(async (t) => {
    await order.update({ status: 'Cancelled' }, { transaction: t });
    await OrderStatusHistory.create(
      { orderId: order.id, status: 'Cancelled', changedBy: req.user.id },
      { transaction: t }
    );
  });

  const full = await Order.findByPk(order.id, { include: includeItems() });
  res.json({ success: true, data: { order: full } });
});

// Admin

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!Order.STATUSES.includes(status)) {
    throw ApiError.badRequest(`Invalid status ${status}`);
  }
  const order = await Order.findByPk(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');

  await sequelize.transaction(async (t) => {
    await order.update({ status }, { transaction: t });
    await OrderStatusHistory.create(
      { orderId: order.id, status, note, changedBy: req.user.id },
      { transaction: t }
    );
  });

  const full = await Order.findByPk(order.id, { include: includeItems() });
  res.json({ success: true, data: { order: full } });
});

exports.listAll = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const where = {};
  if (status) where.status = status;
  const orders = await Order.findAll({
    where,
    include: includeItems(),
    order: [['placed_at', 'DESC']],
    limit: 200,
  });
  res.json({ success: true, data: { orders } });
});
