/* eslint-disable no-console */
require('../config/env');
const { sequelize } = require('../models');

/**
 * Postgres ENUM types can't be altered through `sequelize.sync({ alter })` —
 * adding a new value to an existing enum needs an explicit `ALTER TYPE … ADD
 * VALUE`. We run those statements first so subsequent model sync sees the
 * new values as valid.
 *
 * Each entry maps `enum_<table>_<column>` (Sequelize's auto-generated type
 * name) → array of values that must exist on it. `IF NOT EXISTS` makes
 * each statement idempotent.
 */
const ENUM_VALUE_PATCHES = [
  { type: 'enum_orders_status', values: ['PickedUp'] },
  { type: 'enum_users_role', values: ['staff'] },
];

async function patchEnumValues() {
  for (const { type, values } of ENUM_VALUE_PATCHES) {
    for (const value of values) {
      // Quoted type name + value because some enums have mixed case.
      // ADD VALUE IF NOT EXISTS is supported on Postgres ≥ 9.6.
      try {
        await sequelize.query(
          `ALTER TYPE "${type}" ADD VALUE IF NOT EXISTS '${value}'`
        );
      } catch (err) {
        // If the enum type doesn't exist yet (fresh DB), sync will create
        // it later with the full set, so the patch is a no-op.
        if (!/does not exist/.test(err.message)) throw err;
      }
    }
  }
}

async function migrate() {
  const force = process.argv.includes('--force');
  const alter = !force && process.argv.includes('--alter');

  console.log(`Running database sync (force=${force}, alter=${alter})...`);
  await sequelize.authenticate();

  if (!force) {
    await patchEnumValues();
  }

  await sequelize.sync({ force, alter });
  console.log('Database schema is in sync.');
  await sequelize.close();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
