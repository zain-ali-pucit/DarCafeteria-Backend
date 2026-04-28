const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const userController = require('../controllers/userController');
const fcmTokenController = require('../controllers/fcmTokenController');

const router = express.Router();

router.use(authenticate);

router.get('/profile', userController.getProfile);

router.patch(
  '/profile',
  [
    body('fullName').optional().isString().isLength({ min: 1, max: 120 }),
    body('phone').optional({ nullable: true }).isString().isLength({ max: 32 }),
    body('address').optional({ nullable: true }).isString().isLength({ max: 500 }),
    body('avatarSymbol').optional().isString().isLength({ max: 80 }),
  ],
  validate,
  userController.updateProfile
);

router.post(
  '/change-password',
  [
    body('currentPassword').isString().notEmpty(),
    body('newPassword').isString().isLength({ min: 6, max: 128 }),
  ],
  validate,
  userController.changePassword
);

router.delete('/account', userController.deleteAccount);

// Favorites
router.get('/favorites', userController.listFavorites);
router.post(
  '/favorites/:foodItemId',
  [param('foodItemId').isUUID()],
  validate,
  userController.addFavorite
);
router.delete(
  '/favorites/:foodItemId',
  [param('foodItemId').isUUID()],
  validate,
  userController.removeFavorite
);

// Addresses
router.get('/addresses', userController.listAddresses);
router.post(
  '/addresses',
  [
    body('label').optional().isString().isLength({ max: 40 }),
    body('line').isString().isLength({ min: 1, max: 500 }),
    body('city').optional({ nullable: true }).isString().isLength({ max: 80 }),
    body('country').optional().isString().isLength({ max: 80 }),
    body('isDefault').optional().isBoolean(),
  ],
  validate,
  userController.createAddress
);
router.patch(
  '/addresses/:id',
  [
    param('id').isUUID(),
    body('label').optional().isString().isLength({ max: 40 }),
    body('line').optional().isString().isLength({ min: 1, max: 500 }),
    body('city').optional({ nullable: true }).isString().isLength({ max: 80 }),
    body('country').optional().isString().isLength({ max: 80 }),
    body('isDefault').optional().isBoolean(),
  ],
  validate,
  userController.updateAddress
);
router.delete(
  '/addresses/:id',
  [param('id').isUUID()],
  validate,
  userController.deleteAddress
);

// FCM device tokens — clients call these on token refresh / sign-out.
router.post(
  '/fcm-token',
  [
    body('token').isString().isLength({ min: 32, max: 4096 }),
    body('platform').optional().isIn(['android', 'ios', 'web']),
    body('appVersion').optional({ nullable: true }).isString().isLength({ max: 40 }),
  ],
  validate,
  fcmTokenController.registerToken
);
router.delete(
  '/fcm-token',
  [body('token').isString().isLength({ min: 32, max: 4096 })],
  validate,
  fcmTokenController.unregisterToken
);

module.exports = router;
