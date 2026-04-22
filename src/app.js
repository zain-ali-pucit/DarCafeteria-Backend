const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com',
        ],
        'style-src': [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com',
          'https://fonts.googleapis.com',
        ],
        'font-src': [
          "'self'",
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com',
          'https://fonts.gstatic.com',
          'data:',
        ],
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors({ origin: env.cors.origin }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
}

const limiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(env.apiPrefix, limiter);

app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Dar Cafeteria API',
      version: '1.0.0',
      apiPrefix: env.apiPrefix,
      health: `${env.apiPrefix}/health`,
      admin: '/admin',
    },
  });
});

app.use(env.apiPrefix, routes);

// Static admin panel
const adminPath = path.join(__dirname, '..', 'public', 'admin');
app.use('/admin', express.static(adminPath));
app.get('/admin/*', (req, res, next) => {
  if (req.path.includes('.')) return next();
  res.sendFile(path.join(adminPath, 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
