const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.get('/stats', adminController.stats);

router.get('/users', adminController.listUsers);
router.post(
  '/users',
  [
    body('fullName').isString().isLength({ min: 1, max: 120 }),
    body('email').isEmail(),
    body('password').isString().isLength({ min: 6, max: 128 }),
    body('role').optional().isIn(['customer', 'admin', 'staff']),
    body('phone').optional({ nullable: true }).isString().isLength({ max: 32 }),
    body('address').optional({ nullable: true }).isString().isLength({ max: 500 }),
    body('avatarSymbol').optional().isString().isLength({ max: 80 }),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  adminController.createUser
);
router.get(
  '/users/:id',
  [param('id').isUUID()],
  validate,
  adminController.getUser
);
router.patch(
  '/users/:id',
  [
    param('id').isUUID(),
    body('fullName').optional().isString().isLength({ min: 1, max: 120 }),
    body('phone').optional({ nullable: true }).isString().isLength({ max: 32 }),
    body('address').optional({ nullable: true }).isString().isLength({ max: 500 }),
    body('role').optional().isIn(['customer', 'admin', 'staff']),
    body('isActive').optional().isBoolean(),
    body('avatarSymbol').optional().isString().isLength({ max: 80 }),
  ],
  validate,
  adminController.updateUser
);
router.post(
  '/users/:id/reset-password',
  [
    param('id').isUUID(),
    body('newPassword').isString().isLength({ min: 6, max: 128 }),
  ],
  validate,
  adminController.resetUserPassword
);
router.delete(
  '/users/:id',
  [param('id').isUUID()],
  validate,
  adminController.deleteUser
);

// ── Push notifications ───────────────────────────────────────────────────
router.get('/notifications', notificationController.list);
router.get('/fcm-tokens', notificationController.tokenStats);
router.post(
  '/notifications/send',
  [
    body('target').isIn(['all', 'user', 'token', 'topic']),
    body('userId').optional({ nullable: true }).isUUID(),
    body('token').optional({ nullable: true }).isString().isLength({ max: 4096 }),
    body('topic').optional({ nullable: true }).isString().isLength({ max: 200 }),
    body('title').isString().isLength({ min: 1, max: 160 }),
    body('body').isString().isLength({ min: 1, max: 4000 }),
    body('data').optional({ nullable: true }).isObject(),
  ],
  validate,
  notificationController.send
);

module.exports = router;
