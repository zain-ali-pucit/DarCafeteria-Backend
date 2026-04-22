const { User } = require('../models');
const { signToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

function issueToken(user) {
  return signToken({ sub: user.id, role: user.role });
}

exports.register = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone, address, avatarSymbol } = req.body;

  const existing = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const user = User.build({
    fullName,
    email: email.toLowerCase(),
    phone,
    address,
    avatarSymbol: avatarSymbol || 'person.circle.fill',
  });
  await user.setPassword(password);
  await user.save();

  const token = issueToken(user);
  res.status(201).json({ success: true, data: { user, token } });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid email or password');

  const ok = await user.checkPassword(password);
  if (!ok) throw ApiError.unauthorized('Invalid email or password');

  const token = issueToken(user);
  res.json({ success: true, data: { user, token } });
});

exports.guestLogin = asyncHandler(async (req, res) => {
  let user = await User.findOne({ where: { email: 'guest@darcafeteria.qa' } });
  if (!user) {
    user = User.build({
      fullName: 'Guest User',
      email: 'guest@darcafeteria.qa',
      phone: '+974 0000 0000',
      address: 'Doha, Qatar',
      avatarSymbol: 'person.crop.circle',
    });
    await user.setPassword('guest123');
    await user.save();
  }
  const token = issueToken(user);
  res.json({ success: true, data: { user, token } });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

exports.logout = asyncHandler(async (req, res) => {
  // Stateless JWT — the client discards the token. Endpoint exists for app symmetry.
  res.json({ success: true, data: { message: 'Logged out' } });
});
