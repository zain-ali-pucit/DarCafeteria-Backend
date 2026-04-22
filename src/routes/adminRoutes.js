const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.get('/stats', adminController.stats);

router.get('/users', adminController.listUsers);
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
    body('role').optional().isIn(['customer', 'admin']),
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

module.exports = router;
