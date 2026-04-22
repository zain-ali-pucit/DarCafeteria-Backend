const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const orderController = require('../controllers/orderController');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  [
    body('items').isArray({ min: 1 }),
    body('items.*.foodItemId').isUUID(),
    body('items.*.quantity').isInt({ min: 1 }),
    body('items.*.specialNote').optional({ nullable: true }).isString().isLength({ max: 1000 }),
    body('deliveryAddress').optional({ nullable: true }).isString().isLength({ max: 500 }),
    body('notes').optional({ nullable: true }).isString().isLength({ max: 1000 }),
  ],
  validate,
  orderController.create
);

router.get('/', orderController.listMine);
router.get('/active', orderController.active);
router.get('/history', orderController.history);

router.get(
  '/:id',
  [param('id').isUUID()],
  validate,
  orderController.getOne
);

router.post(
  '/:id/cancel',
  [param('id').isUUID()],
  validate,
  orderController.cancel
);

// Admin
router.get('/admin/all', requireRole('admin'), orderController.listAll);
router.patch(
  '/:id/status',
  requireRole('admin'),
  [
    param('id').isUUID(),
    body('status').isString(),
    body('note').optional({ nullable: true }).isString().isLength({ max: 255 }),
  ],
  validate,
  orderController.updateStatus
);

module.exports = router;
