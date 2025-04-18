const express = require('express');
const router = express.Router();
const { 
  getSubscriptions, 
  getSubscriptionById, 
  createSubscription, 
  updateSubscription, 
  deleteSubscription,
  getSubscriptionStats,
  renewSubscription,
  cancelSubscription,
  getExpiringSoon
} = require('../controllers/SubscriptionController');
const { protect, admin } = require('../middleware/authMiddleware');

// All routes are protected
router.route('/')
  .get(protect, admin, getSubscriptions)
  .post(protect, admin, createSubscription);

router.route('/stats')
  .get(protect, admin, getSubscriptionStats);

router.route('/expiring-soon')
  .get(protect, admin, getExpiringSoon);

router.route('/:id')
  .get(protect, admin, getSubscriptionById)
  .put(protect, admin, updateSubscription)
  .delete(protect, admin, deleteSubscription);

router.route('/:id/renew')
  .post(protect, admin, renewSubscription);

router.route('/:id/cancel')
  .post(protect, admin, cancelSubscription);

module.exports = router;
