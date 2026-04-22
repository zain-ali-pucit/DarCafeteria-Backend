const ApiError = require('../utils/ApiError');
const env = require('../config/env');

function notFound(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  let statusCode = 500;
  let message = 'Internal server error';
  let details = null;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    message = 'Validation error';
    details = err.errors?.map((e) => ({ field: e.path, message: e.message })) || null;
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Invalid reference to related resource';
  } else if (err.status) {
    statusCode = err.status;
    message = err.message || message;
  } else if (err.message) {
    message = err.message;
  }

  if (env.nodeEnv !== 'test' && statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(details ? { details } : {}),
      ...(env.nodeEnv === 'development' && statusCode >= 500 ? { stack: err.stack } : {}),
    },
  });
}

module.exports = { notFound, errorHandler };
