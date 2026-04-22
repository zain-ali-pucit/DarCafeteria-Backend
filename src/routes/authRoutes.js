const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

router.post(
  '/register',
  [
    body('fullName').isString().trim().isLength({ min: 1, max: 120 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 6, max: 128 }),
    body('phone').optional({ nullable: true }).isString().isLength({ max: 32 }),
    body('address').optional({ nullable: true }).isString().isLength({ max: 500 }),
    body('avatarSymbol').optional().isString().isLength({ max: 80 }),
  ],
  validate,
  authController.register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isString().notEmpty(),
  ],
  validate,
  authController.login
);

router.post('/guest', authController.guestLogin);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;
