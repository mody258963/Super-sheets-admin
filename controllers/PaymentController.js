const { Op } = require('sequelize');
const Subscription = require('../models/subscriptionModel');
const Coach = require('../models/coachModel');
const Plan = require('../models/planModel');

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private/Admin
const getPayments = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Filter
    const whereClause = {};
    if (req.query.payment_status) whereClause.payment_status = req.query.payment_status;
    if (req.query.coach_id) whereClause.coach_id = req.query.coach_id;
    if (req.query.plan_id) whereClause.plan_id = req.query.plan_id;
    
    // Date range filter
    if (req.query.start_date && req.query.end_date) {
      whereClause.payment_date = {
        [Op.between]: [req.query.start_date, req.query.end_date]
      };
    }

    const { count, rows } = await Subscription.findAndCountAll({
      where: whereClause,
      attributes: [
        'subscription_id', 
        'payment_status', 
        'payment_date', 
        'payment_method',
        'payment_reference',
        'created_at'
      ],
      include: [
        {
          model: Coach,
          attributes: ['name', 'email']
        },
        {
          model: Plan,
          attributes: ['name', 'price']
        }
      ],
      limit,
      offset,
      order: [['payment_date', 'DESC']]
    });

    res.json({
      total: count,
      page,
      pages: Math.ceil(count / limit),
      payments: rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Private/Admin
const getPaymentById = async (req, res) => {
  try {
    const payment = await Subscription.findByPk(req.params.id, {
      attributes: [
        'subscription_id', 
        'payment_status', 
        'payment_date', 
        'payment_method',
        'payment_reference',
        'payment_notes',
        'created_at'
      ],
      include: [
        {
          model: Coach,
          attributes: ['coach_id', 'name', 'email', 'phone']
        },
        {
          model: Plan,
          attributes: ['plan_id', 'name', 'price', 'duration_days']
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Record a payment
// @route   POST /api/payments
// @access  Private/Admin
const recordPayment = async (req, res) => {
  const { 
    subscription_id, 
    payment_status, 
    payment_method, 
    payment_reference,
    payment_notes
  } = req.body;

  // Validation
  if (!subscription_id || !payment_status) {
    return res.status(400).json({ 
      message: 'Please provide subscription_id and payment_status' 
    });
  }

  try {
    const subscription = await Subscription.findByPk(subscription_id);
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Update payment information
    subscription.payment_status = payment_status;
    subscription.payment_date = new Date();
    subscription.payment_method = payment_method || 'manual';
    subscription.payment_reference = payment_reference || '';
    subscription.payment_notes = payment_notes || '';

    // If payment is successful, update subscription status if it's not active
    if (payment_status === 'paid' && subscription.status !== 'active') {
      subscription.status = 'active';
    }

    const updatedSubscription = await subscription.save();

    res.status(200).json({
      message: 'Payment recorded successfully',
      payment: {
        subscription_id: updatedSubscription.subscription_id,
        payment_status: updatedSubscription.payment_status,
        payment_date: updatedSubscription.payment_date,
        payment_method: updatedSubscription.payment_method,
        payment_reference: updatedSubscription.payment_reference
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update payment information
// @route   PUT /api/payments/:id
// @access  Private/Admin
const updatePayment = async (req, res) => {
  const { 
    payment_status, 
    payment_method, 
    payment_reference,
    payment_notes
  } = req.body;

  try {
    const subscription = await Subscription.findByPk(req.params.id);
    
    if (!subscription) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Update payment information
    if (payment_status) subscription.payment_status = payment_status;
    if (payment_method) subscription.payment_method = payment_method;
    if (payment_reference) subscription.payment_reference = payment_reference;
    if (payment_notes) subscription.payment_notes = payment_notes;

    // If payment status changes to paid, update subscription status if needed
    if (payment_status === 'paid' && subscription.status !== 'active') {
      subscription.status = 'active';
    }

    const updatedSubscription = await subscription.save();

    res.status(200).json({
      message: 'Payment updated successfully',
      payment: {
        subscription_id: updatedSubscription.subscription_id,
        payment_status: updatedSubscription.payment_status,
        payment_date: updatedSubscription.payment_date,
        payment_method: updatedSubscription.payment_method,
        payment_reference: updatedSubscription.payment_reference,
        payment_notes: updatedSubscription.payment_notes
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get payment statistics
// @route   GET /api/payments/stats
// @access  Private/Admin
const getPaymentStats = async (req, res) => {
  try {
    // Get total by payment status
    const paymentStatusCounts = await Subscription.findAll({
      attributes: [
        'payment_status',
        [Subscription.sequelize.fn('COUNT', Subscription.sequelize.col('subscription_id')), 'count'],
        [Subscription.sequelize.fn('SUM', Subscription.sequelize.col('Plan.price')), 'total_amount']
      ],
      include: [{
        model: Plan,
        attributes: []
      }],
      group: ['payment_status'],
      raw: true
    });

    // Get total by payment method
    const paymentMethodCounts = await Subscription.findAll({
      attributes: [
        'payment_method',
        [Subscription.sequelize.fn('COUNT', Subscription.sequelize.col('subscription_id')), 'count'],
        [Subscription.sequelize.fn('SUM', Subscription.sequelize.col('Plan.price')), 'total_amount']
      ],
      include: [{
        model: Plan,
        attributes: []
      }],
      where: {
        payment_method: {
          [Op.ne]: null
        }
      },
      group: ['payment_method'],
      raw: true
    });

    // Get monthly payment totals for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyPayments = await Subscription.findAll({
      attributes: [
        [Subscription.sequelize.fn('YEAR', Subscription.sequelize.col('payment_date')), 'year'],
        [Subscription.sequelize.fn('MONTH', Subscription.sequelize.col('payment_date')), 'month'],
        [Subscription.sequelize.fn('COUNT', Subscription.sequelize.col('subscription_id')), 'count'],
        [Subscription.sequelize.fn('SUM', Subscription.sequelize.col('Plan.price')), 'total_amount']
      ],
      include: [{
        model: Plan,
        attributes: []
      }],
      where: {
        payment_date: {
          [Op.gte]: sixMonthsAgo
        },
        payment_status: 'paid'
      },
      group: [
        Subscription.sequelize.fn('YEAR', Subscription.sequelize.col('payment_date')),
        Subscription.sequelize.fn('MONTH', Subscription.sequelize.col('payment_date'))
      ],
      order: [
        [Subscription.sequelize.fn('YEAR', Subscription.sequelize.col('payment_date')), 'ASC'],
        [Subscription.sequelize.fn('MONTH', Subscription.sequelize.col('payment_date')), 'ASC']
      ],
      raw: true
    });

    res.json({
      paymentStatusCounts,
      paymentMethodCounts,
      monthlyPayments
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get recent payments
// @route   GET /api/payments/recent
// @access  Private/Admin
const getRecentPayments = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const recentPayments = await Subscription.findAll({
      attributes: [
        'subscription_id', 
        'payment_status', 
        'payment_date', 
        'payment_method',
        'payment_reference'
      ],
      include: [
        {
          model: Coach,
          attributes: ['name', 'email']
        },
        {
          model: Plan,
          attributes: ['name', 'price']
        }
      ],
      where: {
        payment_date: {
          [Op.ne]: null
        }
      },
      order: [['payment_date', 'DESC']],
      limit
    });
    
    res.json(recentPayments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getPayments,
  getPaymentById,
  recordPayment,
  updatePayment,
  getPaymentStats,
  getRecentPayments
};
