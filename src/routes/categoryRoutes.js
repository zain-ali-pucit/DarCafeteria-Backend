const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const categoryController = require('../controllers/categoryController');

const router = express.Router();

router.get('/', categoryController.list);

router.post(
  '/',
  authenticate,
  requireRole('admin'),
  [
    body('key').isString().isLength({ min: 1, max: 40 }),
    body('name').isString().isLength({ min: 1, max: 80 }),
    body('nameAr').isString().isLength({ min: 1, max: 80 }),
    body('symbolName').optional({ nullable: true }).isString().isLength({ max: 80 }),
    body('sortOrder').optional().isInt(),
  ],
  validate,
  categoryController.create
);

router.patch(
  '/:id',
  authenticate,
  requireRole('admin'),
  [
    param('id').isUUID(),
    body('key').optional().isString().isLength({ min: 1, max: 40 }),
    body('name').optional().isString().isLength({ min: 1, max: 80 }),
    body('nameAr').optional().isString().isLength({ min: 1, max: 80 }),
    body('symbolName').optional({ nullable: true }).isString().isLength({ max: 80 }),
    body('sortOrder').optional().isInt(),
  ],
  validate,
  categoryController.update
);

router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  [param('id').isUUID()],
  validate,
  categoryController.remove
);

module.exports = router;
