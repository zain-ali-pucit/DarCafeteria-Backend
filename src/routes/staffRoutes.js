const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const staffController = require('../controllers/staffController');

const router = express.Router();

// Staff endpoints are open to both staff and admin roles. Admins use them
// from the same Staff Panel in the admin SPA when they want to fill in for
// a rider — there's no need to require role=staff exclusively.
router.use(authenticate, requireRole('staff', 'admin'));

router.get(
  '/orders',
  [query('tab').optional().isIn(['pending', 'pickedup', 'completed'])],
  validate,
  staffController.listOrders
);

router.get(
  '/orders/:id',
  [param('id').isUUID()],
  validate,
  staffController.getOrder
);

router.post(
  '/orders/:id/pickup',
  [
    param('id').isUUID(),
    body('etaMinMinutes').isInt({ min: 0, max: 600 }),
    body('etaMaxMinutes').isInt({ min: 0, max: 600 }),
    body('riderName').optional({ nullable: true }).isString().isLength({ max: 120 }),
    body('riderPhone').optional({ nullable: true }).isString().isLength({ max: 32 }),
  ],
  validate,
  staffController.pickUp
);

router.post(
  '/orders/:id/complete',
  [param('id').isUUID()],
  validate,
  staffController.complete
);

router.post(
  '/orders/:id/cancel',
  [
    param('id').isUUID(),
    body('note').optional({ nullable: true }).isString().isLength({ max: 240 }),
  ],
  validate,
  staffController.cancel
);

module.exports = router;
