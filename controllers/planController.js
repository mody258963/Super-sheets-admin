const { Op } = require('sequelize');
const Plan = require('../models/planModel');
const Subscription = require('../models/subscriptionModel');

// @desc    Get all plans
// @route   GET /api/plans
// @access  Private
const getPlans = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Filter
    const whereClause = {};
    if (req.query.is_active) whereClause.is_active = req.query.is_active === 'true';
    if (req.query.search) {
      whereClause.name = { [Op.like]: `%${req.query.search}%` };
    }

    const { count, rows } = await Plan.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      total: count,
      page,
      pages: Math.ceil(count / limit),
      plans: rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get plan by ID
// @route   GET /api/plans/:id
// @access  Private
const getPlanById = async (req, res) => {
  try {
    const plan = await Plan.findByPk(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    res.json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Create a plan
// @route   POST /api/plans
// @access  Private/Admin
const createPlan = async (req, res) => {
  const { name, price, duration_days, features, is_active } = req.body;

  // Validation
  if (!name || !price || !duration_days) {
    return res.status(400).json({ 
      message: 'Please provide name, price and duration' 
    });
  }

  try {
    const plan = await Plan.create({
      name,
      price,
      duration_days,
      features,
      is_active: is_active !== undefined ? is_active : true
    });

    res.status(201).json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update plan
// @route   PUT /api/plans/:id
// @access  Private/Admin
const updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findByPk(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Update fields
    plan.name = req.body.name || plan.name;
    plan.price = req.body.price || plan.price;
    plan.duration_days = req.body.duration_days || plan.duration_days;
    plan.features = req.body.features || plan.features;
    
    // Only update is_active if provided
    if (req.body.is_active !== undefined) {
      plan.is_active = req.body.is_active;
    }

    const updatedPlan = await plan.save();
    res.json(updatedPlan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete plan
// @route   DELETE /api/plans/:id
// @access  Private/Admin
const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findByPk(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Check for active subscriptions
    const activeSubscriptions = await Subscription.count({ 
      where: { 
        plan_id: plan.plan_id,
        status: 'active'
      }
    });

    if (activeSubscriptions > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete plan with active subscriptions' 
      });
    }

    await plan.destroy();
    res.json({ message: 'Plan removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan
};