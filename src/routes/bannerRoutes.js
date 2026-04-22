const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const bannerController = require('../controllers/bannerController');

const router = express.Router();

router.get('/', bannerController.list);

router.get(
  '/all',
  authenticate,
  requireRole('admin'),
  bannerController.listAll
);

router.post(
  '/',
  authenticate,
  requireRole('admin'),
  [
    body('taglineKey').isString().isLength({ min: 1, max: 80 }),
    body('titleKey').isString().isLength({ min: 1, max: 80 }),
    body('subtitleKey').isString().isLength({ min: 1, max: 80 }),
    body('gradientColors').optional().isArray(),
    body('symbolName').optional({ nullable: true }).isString().isLength({ max: 80 }),
    body('sortOrder').optional().isInt(),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  bannerController.create
);

router.patch(
  '/:id',
  authenticate,
  requireRole('admin'),
  [param('id').isUUID()],
  validate,
  bannerController.update
);

router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  [param('id').isUUID()],
  validate,
  bannerController.remove
);

module.exports = router;
