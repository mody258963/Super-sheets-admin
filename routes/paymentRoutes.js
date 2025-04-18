const express = require('express');
const router = express.Router();
const { 
  getPayments, 
  getPaymentById, 
  recordPayment, 
  updatePayment,
  getPaymentStats,
  getRecentPayments
} = require('../controllers/PaymentController');
const { protect, admin } = require('../middleware/authMiddleware');

// All routes are protected
router.route('/')
  .get(protect, admin, getPayments)
  .post(protect, admin, recordPayment);

router.route('/stats')
  .get(protect, admin, getPaymentStats);

router.route('/recent')
  .get(protect, admin, getRecentPayments);

router.route('/:id')
  .get(protect, admin, getPaymentById)
  .put(protect, admin, updatePayment);

module.exports = router;
