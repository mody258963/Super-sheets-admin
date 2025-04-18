const { Op } = require('sequelize');
const Subscription = require('../models/subscriptionModel');
const Coach = require('../models/coachModel');
const Plan = require('../models/planModel');
const db = require('../models/db');

// @desc    Get dashboard summary statistics
// @route   GET /api/dashboard/summary
// @access  Private/Admin
const getDashboardSummary = async (req, res) => {
  try {
    // Get total coaches count
    const totalCoaches = await Coach.count();
    
    // Get active coaches (with active subscriptions)
    const activeCoaches = await Coach.count({
      include: [{
        model: Subscription,
        as: 'subscriptions',
        where: { status: 'active' },
        required: true
      }]
    });
    
    // Get total subscriptions
    const totalSubscriptions = await Subscription.count();
    
    // Get active subscriptions
    const activeSubscriptions = await Subscription.count({
      where: { status: 'active' }
    });
    
    // Get total revenue
    const revenueResult = await Subscription.findOne({
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('Plan.price')), 'total']
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
    
    const totalRevenue = revenueResult?.total || 0;
    
    // Get monthly revenue for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyRevenue = await Subscription.findAll({
      attributes: [
        [db.sequelize.fn('YEAR', db.sequelize.col('start_date')), 'year'],
        [db.sequelize.fn('MONTH', db.sequelize.col('start_date')), 'month'],
        [db.sequelize.fn('SUM', db.sequelize.col('Plan.price')), 'revenue']
      ],
      include: [{
        model: Plan,
        attributes: []
      }],
      where: {
        payment_status: 'paid',
        start_date: {
          [Op.gte]: sixMonthsAgo
        }
      },
      group: [
        db.sequelize.fn('YEAR', db.sequelize.col('start_date')),
        db.sequelize.fn('MONTH', db.sequelize.col('start_date'))
      ],
      order: [
        [db.sequelize.fn('YEAR', db.sequelize.col('start_date')), 'ASC'],
        [db.sequelize.fn('MONTH', db.sequelize.col('start_date')), 'ASC']
      ],
      raw: true
    });
    
    // Get subscriptions by plan
    const subscriptionsByPlan = await Subscription.findAll({
      attributes: [
        'plan_id',
        [db.sequelize.fn('COUNT', db.sequelize.col('subscription_id')), 'count']
      ],
      include: [{
        model: Plan,
        attributes: ['name']
      }],
      where: {
        status: 'active'
      },
      group: ['plan_id', 'Plan.name'],
      raw: true
    });
    
    // Get recent subscriptions
    const recentSubscriptions = await Subscription.findAll({
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
      order: [['created_at', 'DESC']],
      limit: 5
    });
    
    // Get expiring soon subscriptions
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    const expiringSoon = await Subscription.count({
      where: {
        status: 'active',
        end_date: {
          [Op.between]: [today, nextWeek]
        }
      }
    });
    
    res.json({
      totalCoaches,
      activeCoaches,
      totalSubscriptions,
      activeSubscriptions,
      totalRevenue,
      monthlyRevenue,
      subscriptionsByPlan,
      recentSubscriptions,
      expiringSoon
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get revenue analytics
// @route   GET /api/dashboard/revenue
// @access  Private/Admin
const getRevenueAnalytics = async (req, res) => {
  try {
    const { period } = req.query;
    let timeFormat, groupByClause, startDate;
    const now = new Date();
    
    // Set time period for the query
    switch(period) {
      case 'week':
        timeFormat = 'day';
        groupByClause = [db.sequelize.fn('DATE', db.sequelize.col('start_date'))];
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        timeFormat = 'day';
        groupByClause = [db.sequelize.fn('DATE', db.sequelize.col('start_date'))];
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        timeFormat = 'week';
        groupByClause = [
          db.sequelize.fn('YEAR', db.sequelize.col('start_date')),
          db.sequelize.fn('WEEK', db.sequelize.col('start_date'))
        ];
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
      default:
        timeFormat = 'month';
        groupByClause = [
          db.sequelize.fn('YEAR', db.sequelize.col('start_date')),
          db.sequelize.fn('MONTH', db.sequelize.col('start_date'))
        ];
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
    }
    
    // Get revenue data
    const revenueData = await Subscription.findAll({
      attributes: [
        ...(timeFormat === 'day' ? 
          [[db.sequelize.fn('DATE', db.sequelize.col('start_date')), 'date']] : 
          [
            [db.sequelize.fn('YEAR', db.sequelize.col('start_date')), 'year'],
            [db.sequelize.fn(timeFormat === 'month' ? 'MONTH' : 'WEEK', db.sequelize.col('start_date')), timeFormat]
          ]
        ),
        [db.sequelize.fn('SUM', db.sequelize.col('Plan.price')), 'revenue'],
        [db.sequelize.fn('COUNT', db.sequelize.col('subscription_id')), 'count']
      ],
      include: [{
        model: Plan,
        attributes: []
      }],
      where: {
        payment_status: 'paid',
        start_date: {
          [Op.gte]: startDate
        }
      },
      group: groupByClause,
      order: groupByClause.map(clause => [clause, 'ASC']),
      raw: true
    });
    
    // Get revenue by plan
    const revenueByPlan = await Subscription.findAll({
      attributes: [
        'plan_id',
        [db.sequelize.fn('SUM', db.sequelize.col('Plan.price')), 'revenue'],
        [db.sequelize.fn('COUNT', db.sequelize.col('subscription_id')), 'count']
      ],
      include: [{
        model: Plan,
        attributes: ['name']
      }],
      where: {
        payment_status: 'paid',
        start_date: {
          [Op.gte]: startDate
        }
      },
      group: ['plan_id', 'Plan.name'],
      raw: true
    });
    
    res.json({
      period,
      revenueData,
      revenueByPlan
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get coach analytics
// @route   GET /api/dashboard/coaches
// @access  Private/Admin
const getCoachAnalytics = async (req, res) => {
  try {
    // Get coaches by status
    const coachesByStatus = await Coach.findAll({
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('coach_id')), 'count']
      ],
      group: ['status'],
      raw: true
    });
    
    // Get new coaches per month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const newCoachesPerMonth = await Coach.findAll({
      attributes: [
        [db.sequelize.fn('YEAR', db.sequelize.col('created_at')), 'year'],
        [db.sequelize.fn('MONTH', db.sequelize.col('created_at')), 'month'],
        [db.sequelize.fn('COUNT', db.sequelize.col('coach_id')), 'count']
      ],
      where: {
        created_at: {
          [Op.gte]: sixMonthsAgo
        }
      },
      group: [
        db.sequelize.fn('YEAR', db.sequelize.col('created_at')),
        db.sequelize.fn('MONTH', db.sequelize.col('created_at'))
      ],
      order: [
        [db.sequelize.fn('YEAR', db.sequelize.col('created_at')), 'ASC'],
        [db.sequelize.fn('MONTH', db.sequelize.col('created_at')), 'ASC']
      ],
      raw: true
    });
    
    // Get top coaches by subscription count
    const topCoaches = await Coach.findAll({
      attributes: [
        'coach_id',
        'name',
        'email',
        [db.sequelize.fn('COUNT', db.sequelize.col('subscriptions.subscription_id')), 'subscription_count']
      ],
      include: [{
        model: Subscription,
        as: 'subscriptions',
        attributes: []
      }],
      group: ['coach_id', 'name', 'email'],
      order: [[db.sequelize.literal('subscription_count'), 'DESC']],
      limit: 5,
      raw: true
    });
    
    // Get coaches without active subscriptions
    const inactiveCoaches = await Coach.findAll({
      attributes: ['coach_id', 'name', 'email', 'created_at'],
      include: [{
        model: Subscription,
        as: 'subscriptions',
        where: { status: 'active' },
        required: false
      }],
      where: db.sequelize.literal('subscriptions.subscription_id IS NULL'),
      limit: 10
    });
    
    res.json({
      coachesByStatus,
      newCoachesPerMonth,
      topCoaches,
      inactiveCoaches
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getDashboardSummary,
  getRevenueAnalytics,
  getCoachAnalytics
};
