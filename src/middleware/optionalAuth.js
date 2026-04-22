const { verifyToken } = require('../utils/jwt');
const { User } = require('../models');

async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next();

  try {
    const payload = verifyToken(token);
    const user = await User.findByPk(payload.sub);
    if (user && user.isActive) req.user = user;
  } catch {
    // ignore — optional auth
  }
  next();
}

module.exports = optionalAuth;
