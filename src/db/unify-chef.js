/* eslint-disable no-console */

/**
 * One-shot data fix: collapse every food item's chef name to "Dar" / "دار".
 *
 * Run with:
 *   npm run db:unify-chef
 *
 * Idempotent — safe to run multiple times. Only updates rows whose values
 * differ from the canonical "Dar" / "دار", so subsequent runs are a no-op.
 */

const { Op } = require('sequelize');
const { sequelize, FoodItem } = require('../models');

const CHEF_NAME_EN = 'Dar';
const CHEF_NAME_AR = 'دار';

(async function run() {
  try {
    await sequelize.authenticate();
    const [count] = await FoodItem.update(
      { chefName: CHEF_NAME_EN, chefNameAr: CHEF_NAME_AR },
      {
        where: {
          [Op.or]: [
            { chefName: { [Op.ne]: CHEF_NAME_EN } },
            { chefNameAr: { [Op.ne]: CHEF_NAME_AR } },
          ],
        },
      }
    );
    console.log(`✓ Updated ${count} food item(s) — every dish is now by "Dar" (دار).`);
    process.exit(0);
  } catch (err) {
    console.error('✗ Failed to unify chef name:', err);
    process.exit(1);
  }
})();
