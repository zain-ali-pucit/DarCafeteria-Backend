/* eslint-disable no-console */
require('../config/env');
const { sequelize } = require('../models');

async function migrate() {
  const force = process.argv.includes('--force');
  const alter = !force && process.argv.includes('--alter');

  console.log(`Running database sync (force=${force}, alter=${alter})...`);
  await sequelize.authenticate();
  await sequelize.sync({ force, alter });
  console.log('Database schema is in sync.');
  await sequelize.close();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
