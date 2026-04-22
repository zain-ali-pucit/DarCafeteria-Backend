/* eslint-disable no-console */
const app = require('./app');
const env = require('./config/env');
const { sequelize } = require('./models');

async function start() {
  try {
    await sequelize.authenticate();
    console.log(`✓ Database connected (${env.db.host}:${env.db.port}/${env.db.name})`);

    if (env.nodeEnv === 'development') {
      await sequelize.sync();
      console.log('✓ Models synchronized');
    }

    const server = app.listen(env.port, () => {
      console.log(`✓ Dar Cafeteria API listening on http://localhost:${env.port}${env.apiPrefix}`);
    });

    const shutdown = async (signal) => {
      console.log(`\n${signal} received — shutting down...`);
      server.close(() => console.log('HTTP server closed'));
      await sequelize.close();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
