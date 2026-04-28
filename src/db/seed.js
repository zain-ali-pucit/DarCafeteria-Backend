/* eslint-disable no-console */
require('../config/env');
const { sequelize, Category, FoodItem, Banner, User } = require('../models');
const seed = require('./seedData');

async function run() {
  console.log('Seeding database...');
  await sequelize.authenticate();
  await sequelize.sync();

  // Categories
  for (const c of seed.categories) {
    await Category.upsert(c);
  }
  console.log(`  ✓ ${seed.categories.length} categories`);

  // Food items — upsert by (name, chefName) so re-seeding is idempotent
  for (const item of seed.foodItems) {
    const [existing] = await FoodItem.findOrCreate({
      where: { name: item.name, chefName: item.chefName },
      defaults: item,
    });
    await existing.update(item);
  }
  console.log(`  ✓ ${seed.foodItems.length} food items`);

  // Banners
  for (const b of seed.banners) {
    const [row] = await Banner.findOrCreate({
      where: { titleKey: b.titleKey, subtitleKey: b.subtitleKey },
      defaults: b,
    });
    await row.update(b);
  }
  console.log(`  ✓ ${seed.banners.length} banners`);

  async function upsertUser(email, attrs, password) {
    let user = await User.findOne({ where: { email } });
    if (!user) {
      user = User.build({ email, ...attrs });
      await user.setPassword(password);
      await user.save();
    } else {
      Object.assign(user, attrs);
      await user.setPassword(password);
      await user.save();
    }
    return user;
  }

  await upsertUser(
    'admin@darcafeteria.com',
    {
      fullName: 'Dar Cafeteria Admin',
      role: 'admin',
      phone: '+974 0000 0000',
      address: 'Doha, Qatar',
      avatarSymbol: 'person.crop.circle.fill.badge.checkmark',
      isActive: true,
    },
    'Darcafeteria11223344'
  );
  console.log('  ✓ primary admin (admin@darcafeteria.com / Darcafeteria11223344)');

  await upsertUser(
    'admin@darcafeteria.qa',
    {
      fullName: 'Admin (Demo)',
      role: 'admin',
      phone: '+974 0000 0001',
      address: 'Doha, Qatar',
      isActive: true,
    },
    'admin123'
  );
  console.log('  ✓ demo admin (admin@darcafeteria.qa / admin123)');

  await upsertUser(
    'guest@darcafeteria.qa',
    {
      fullName: 'Guest User',
      phone: '+974 0000 0000',
      address: 'Doha, Qatar',
      avatarSymbol: 'person.crop.circle',
      isActive: true,
    },
    'guest123'
  );
  console.log('  ✓ guest user (guest@darcafeteria.qa / guest123)');

  await upsertUser(
    'rider@darcafeteria.qa',
    {
      fullName: 'Khalid Al-Mansouri',
      role: 'staff',
      phone: '+974 5555 1234',
      address: 'Doha, Qatar',
      avatarSymbol: 'figure.outdoor.cycle',
      isActive: true,
    },
    'rider123'
  );
  console.log('  ✓ demo staff/rider (rider@darcafeteria.qa / rider123)');

  await sequelize.close();
  console.log('Done.');
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
