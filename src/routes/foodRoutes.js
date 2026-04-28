const express = require('express');
const { param, body, query } = require('express-validator');
const validate = require('../middleware/validate');
const optionalAuth = require('../middleware/optionalAuth');
const { authenticate, requireRole } = require('../middleware/auth');
const foodController = require('../controllers/foodController');

const router = express.Router();

router.get(
  '/',
  optionalAuth,
  [
    query('category').optional().isString(),
    query('search').optional().isString(),
    query('popular').optional().isBoolean(),
    query('chefSpecial').optional().isBoolean(),
    query('includeUnavailable').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  foodController.list
);

router.get('/popular', optionalAuth, foodController.popular);
router.get('/chef-specials', optionalAuth, foodController.chefSpecials);

router.get(
  '/search',
  optionalAuth,
  [query('q').isString().isLength({ min: 1 })],
  validate,
  foodController.search
);

router.get(
  '/:id',
  optionalAuth,
  [param('id').isUUID()],
  validate,
  foodController.getOne
);

// Admin-only management
router.post(
  '/',
  authenticate,
  requireRole('admin'),
  [
    body('name').isString().isLength({ min: 1, max: 160 }),
    body('nameAr').isString().isLength({ min: 1, max: 160 }),
    body('description').isString(),
    body('descriptionAr').isString(),
    // chefName / chefNameAr are auto-defaulted server-side ("Dar") — every
    // dish on the menu is "by Dar", so admins don't need to fill them in.
    body('chefName').optional().isString().isLength({ max: 120 }),
    body('chefNameAr').optional().isString().isLength({ max: 120 }),
    body('price').isFloat({ min: 0 }),
    body('categoryKey').isString(),
  ],
  validate,
  foodController.create
);

router.patch(
  '/:id',
  authenticate,
  requireRole('admin'),
  [param('id').isUUID()],
  validate,
  foodController.update
);

router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  [param('id').isUUID()],
  validate,
  foodController.remove
);

module.exports = router;
