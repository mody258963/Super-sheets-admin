const express = require('express');
const router = express.Router();
const { 
  getNotifications, 
  sendExpiringNotification, 
  sendPaymentReminder,
  sendBulkExpiringNotifications,
  getNotificationSettings,
  updateNotificationSettings
} = require('../controllers/NotificationController');
const { protect, admin } = require('../middleware/authMiddleware');

// All routes are protected and admin-only
router.route('/')
  .get(protect, admin, getNotifications);

router.route('/settings')
  .get(protect, admin, getNotificationSettings)
  .put(protect, admin, updateNotificationSettings);

router.route('/expiring/:id')
  .post(protect, admin, sendExpiringNotification);

router.route('/payment/:id')
  .post(protect, admin, sendPaymentReminder);

router.route('/bulk/expiring')
  .post(protect, admin, sendBulkExpiringNotifications);

module.exports = router;
