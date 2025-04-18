const { Op } = require('sequelize');
const Subscription = require('../models/subscriptionModel');
const Coach = require('../models/coachModel');
const Plan = require('../models/planModel');

// @desc    Get all subscriptions
// @route   GET /api/subscriptions
// @access  Private/Admin
const getSubscriptions = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Filter
    const whereClause = {};
    if (req.query.status) whereClause.status = req.query.status;
    if (req.query.payment_status) whereClause.payment_status = req.query.payment_status;
    if (req.query.coach_id) whereClause.coach_id = req.query.coach_id;
    if (req.query.plan_id) whereClause.plan_id = req.query.plan_id;
    
    // Date range filter
    if (req.query.start_date && req.query.end_date) {
      whereClause.start_date = {
        [Op.between]: [req.query.start_date, req.query.end_date]
      };
    }

    const { count, rows } = await Subscription.findAndCountAll({
      where: whereClause,
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
      order: [['start_date', 'DESC']]
    });

    res.json({
      total: count,
      page,
      pages: Math.ceil(count / limit),
      subscriptions: rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get subscription by ID
// @route   GET /api/subscriptions/:id
// @access  Private/Admin
const getSubscriptionById = async (req, res) => {
  try {
    const subscription = await Subscription.findByPk(req.params.id, {
      include: [
        {
          model: Coach,
          attributes: ['name', 'email', 'phone']
        },
        {
          model: Plan,
          attributes: ['name', 'price', 'duration_days', 'features']
        }
      ]
    });

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    res.json(subscription);
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Create a subscription
// @route   POST /api/subscriptions
// @access  Private/Admin
const createSubscription = async (req, res) => {
  const { coach_id, plan_id, start_date, end_date, status, payment_status } = req.body;

  // Validation
  if (!coach_id || !plan_id || !start_date || !end_date) {
    return res.status(400).json({ 
      message: 'Please provide coach_id, plan_id, start_date and end_date' 
    });
  }

  try {
    // Check if coach exists
    const coach = await Coach.findByPk(coach_id);
    if (!coach) {
      return res.status(404).json({ message: 'Coach not found' });
    }

    // Check if plan exists
    const plan = await Plan.findByPk(plan_id);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Check for overlapping subscriptions
    const overlappingSubscription = await Subscription.findOne({
      where: {
        coach_id,
        [Op.or]: [
          {
            start_date: { [Op.lte]: end_date },
            end_date: { [Op.gte]: start_date }
          }
        ]
      }
    });

    if (overlappingSubscription) {
      return res.status(400).json({ 
        message: 'Coach already has an active subscription for this period' 
      });
    }

    const subscription = await Subscription.create({
      coach_id,
      plan_id,
      start_date,
      end_date,
      status: status || 'active',
      payment_status: payment_status || 'paid'
    });

    res.status(201).json(subscription);
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update subscription
// @route   PUT /api/subscriptions/:id
// @access  Private/Admin
const updateSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByPk(req.params.id);
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Update fields
    if (req.body.coach_id) {
      const coach = await Coach.findByPk(req.body.coach_id);
      if (!coach) {
        return res.status(404).json({ message: 'Coach not found' });
      }
      subscription.coach_id = req.body.coach_id;
    }

    if (req.body.plan_id) {
      const plan = await Plan.findByPk(req.body.plan_id);
      if (!plan) {
        return res.status(404).json({ message: 'Plan not found' });
      }
      subscription.plan_id = req.body.plan_id;
    }

    // Date validation
    if (req.body.start_date || req.body.end_date) {
      const newStartDate = req.body.start_date || subscription.start_date;
      const newEndDate = req.body.end_date || subscription.end_date;

      // Check for overlapping subscriptions (excluding current one)
      const overlappingSubscription = await Subscription.findOne({
        where: {
          coach_id: subscription.coach_id,
          subscription_id: { [Op.ne]: subscription.subscription_id },
          [Op.or]: [
            {
              start_date: { [Op.lte]: newEndDate },
              end_date: { [Op.gte]: newStartDate }
            }
          ]
        }
      });

      if (overlappingSubscription) {
        return res.status(400).json({ 
          message: 'Coach already has an active subscription for this period' 
        });
      }

      subscription.start_date = newStartDate;
      subscription.end_date = newEndDate;
    }

    if (req.body.status) subscription.status = req.body.status;
    if (req.body.payment_status) subscription.payment_status = req.body.payment_status;

    const updatedSubscription = await subscription.save();
    res.json(updatedSubscription);
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete subscription
// @route   DELETE /api/subscriptions/:id
// @access  Private/Admin
const deleteSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByPk(req.params.id);
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    await subscription.destroy();
    res.json({ message: 'Subscription removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get subscription statistics
// @route   GET /api/subscriptions/stats
// @access  Private/Admin
const getSubscriptionStats = async (req, res) => {
  try {
    // Get total count by status
    const statusCounts = await Subscription.findAll({
      attributes: [
        'status',
        [Subscription.sequelize.fn('COUNT', Subscription.sequelize.col('subscription_id')), 'count']
      ],
      group: ['status']
    });

    // Get total count by payment status
    const paymentStatusCounts = await Subscription.findAll({
      attributes: [
        'payment_status',
        [Subscription.sequelize.fn('COUNT', Subscription.sequelize.col('subscription_id')), 'count']
      ],
      group: ['payment_status']
    });

    // Get total revenue
    const totalRevenue = await Subscription.findAll({
      attributes: [
        [Subscription.sequelize.fn('SUM', Subscription.sequelize.col('Plan.price')), 'total']
      ],
      include: [{
        model: Plan,
        attributes: []
      }],
      where: {
        payment_status: 'paid'
      },
      raw: true
    });

    // Get subscriptions per plan
    const subscriptionsPerPlan = await Subscription.findAll({
      attributes: [
        'plan_id',
        [Subscription.sequelize.fn('COUNT', Subscription.sequelize.col('subscription_id')), 'count']
      ],
      include: [{
        model: Plan,
        attributes: ['name']
      }],
      group: ['plan_id', 'Plan.name']
    });

    res.json({
      statusCounts,
      paymentStatusCounts,
      totalRevenue: totalRevenue[0]?.total || 0,
      subscriptionsPerPlan
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Renew a subscription
// @route   POST /api/subscriptions/:id/renew
// @access  Private/Admin
const renewSubscription = async (req, res) => {
  try {
    const { duration_days } = req.body;
    
    if (!duration_days) {
      return res.status(400).json({ message: 'Please provide duration_days' });
    }

    const subscription = await Subscription.findByPk(req.params.id, {
      include: [{ model: Plan }]
    });

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Calculate new end date
    const currentEndDate = new Date(subscription.end_date);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(currentEndDate.getDate() + parseInt(duration_days));

    // Check for overlapping subscriptions
    const overlappingSubscription = await Subscription.findOne({
      where: {
        coach_id: subscription.coach_id,
        subscription_id: { [Op.ne]: subscription.subscription_id },
        [Op.or]: [
          {
            start_date: { [Op.lte]: newEndDate },
            end_date: { [Op.gte]: currentEndDate }
          }
        ]
      }
    });

    if (overlappingSubscription) {
      return res.status(400).json({ 
        message: 'Coach already has an active subscription for this period' 
      });
    }

    // Update subscription
    subscription.end_date = newEndDate;
    subscription.status = 'active';
    
    const updatedSubscription = await subscription.save();
    
    res.json({
      message: 'Subscription renewed successfully',
      subscription: updatedSubscription
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Cancel a subscription
// @route   POST /api/subscriptions/:id/cancel
// @access  Private/Admin
const cancelSubscription = async (req, res) => {
  try {
    const { cancellation_reason } = req.body;
    
    const subscription = await Subscription.findByPk(req.params.id);
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // Update subscription
    subscription.status = 'cancelled';
    subscription.cancellation_reason = cancellation_reason || 'Cancelled by admin';
    subscription.cancelled_at = new Date();
    
    const updatedSubscription = await subscription.save();
    
    res.json({
      message: 'Subscription cancelled successfully',
      subscription: updatedSubscription
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get subscriptions expiring soon
// @route   GET /api/subscriptions/expiring-soon
// @access  Private/Admin
const getExpiringSoon = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    
    // Calculate date range
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);
    
    const subscriptions = await Subscription.findAll({
      where: {
        status: 'active',
        end_date: {
          [Op.between]: [today, futureDate]
        }
      },
      include: [
        {
          model: Coach,
          attributes: ['name', 'email', 'phone']
        },
        {
          model: Plan,
          attributes: ['name', 'price']
        }
      ],
      order: [['end_date', 'ASC']]
    });
    
    res.json(subscriptions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getSubscriptions,
  getSubscriptionById,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  getSubscriptionStats,
  renewSubscription,
  cancelSubscription,
  getExpiringSoon
};