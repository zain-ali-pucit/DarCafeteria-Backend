const express = require('express');

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const foodRoutes = require('./foodRoutes');
const orderRoutes = require('./orderRoutes');
const categoryRoutes = require('./categoryRoutes');
const bannerRoutes = require('./bannerRoutes');
const adminRoutes = require('./adminRoutes');
const staffRoutes = require('./staffRoutes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() },
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/foods', foodRoutes);
router.use('/orders', orderRoutes);
router.use('/categories', categoryRoutes);
router.use('/banners', bannerRoutes);
router.use('/admin', adminRoutes);
router.use('/staff', staffRoutes);

module.exports = router;
