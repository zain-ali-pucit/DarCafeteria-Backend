/* eslint-disable no-console */

/**
 * One-shot migration for the super-admin login.
 *
 * Renames the existing primary admin row from `admin@darcafeteria.com` to
 * `admin@shinearabia.com` and resets the password to `Darcafeteria11223344`.
 * If the old row doesn't exist (e.g. fresh DB), creates the new one
 * directly. Idempotent — safe to run multiple times.
 *
 *   npm run db:rename-super-admin
 */

require('../config/env');
const { sequelize, User } = require('../models');

const OLD_EMAIL = 'admin@shinearabia.com';
const NEW_EMAIL = 'admin@darcafeteria.com';
const NEW_PASSWORD = 'Darcafeteria11223344';

(async function run() {
  try {
    await sequelize.authenticate();

    let user = await User.findOne({ where: { email: NEW_EMAIL } });
    if (user) {
      // Already migrated — just make sure the password is current and
      // role/active flags are correct.
      await user.setPassword(NEW_PASSWORD);
      user.role = 'admin';
      user.isActive = true;
      await user.save();
      console.log(`✓ Updated existing ${NEW_EMAIL} (password reset).`);
      process.exit(0);
    }

    user = await User.findOne({ where: { email: OLD_EMAIL } });
    if (user) {
      user.email = NEW_EMAIL;
      await user.setPassword(NEW_PASSWORD);
      user.role = 'admin';
      user.isActive = true;
      await user.save();
      console.log(`✓ Renamed ${OLD_EMAIL} → ${NEW_EMAIL} and reset password.`);
      process.exit(0);
    }

    // Nothing to migrate — bootstrap a fresh super admin.
    user = User.build({
      email: NEW_EMAIL,
      fullName: 'Dar Cafeteria Admin',
      role: 'admin',
      phone: '+974 0000 0000',
      address: 'Doha, Qatar',
      avatarSymbol: 'person.crop.circle.fill.badge.checkmark',
      isActive: true,
    });
    await user.setPassword(NEW_PASSWORD);
    await user.save();
    console.log(`✓ Created ${NEW_EMAIL} from scratch.`);
    process.exit(0);
  } catch (err) {
    console.error('✗ Failed to rename super admin:', err);
    process.exit(1);
  }
})();
