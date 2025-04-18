const express = require('express');
const router = express.Router();
const { 
  getDashboardSummary, 
  getRevenueAnalytics, 
  getCoachAnalytics 
} = require('../controllers/DashboardController');
const { protect, admin } = require('../middleware/authMiddleware');

// All routes are protected and admin-only
router.route('/summary')
  .get(protect, admin, getDashboardSummary);

router.route('/revenue')
  .get(protect, admin, getRevenueAnalytics);

router.route('/coaches')
  .get(protect, admin, getCoachAnalytics);

module.exports = router;
