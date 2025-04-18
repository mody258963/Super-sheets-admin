const bcrypt = require('bcryptjs');
const Coach = require('../models/coachModel');
const Subscription = require('../models/subscriptionModel');

// @desc    Get all coaches
// @route   GET /api/coaches
// @access  Private/Admin
const getCoaches = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Search/filter
    const whereClause = {};
    if (req.query.status) whereClause.status = req.query.status;
    if (req.query.search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${req.query.search}%` } },
        { email: { [Op.like]: `%${req.query.search}%` } }
      ];
    }

    const { count, rows } = await Coach.findAndCountAll({
      attributes: ['coach_id', 'name', 'email', 'phone', 'status', 'created_at'],
      where: whereClause,
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      total: count,
      page,
      pages: Math.ceil(count / limit),
      coaches: rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get coach by ID
// @route   GET /api/coaches/:id
// @access  Private/Admin
const getCoachById = async (req, res) => {
  try {
    const coach = await Coach.findByPk(req.params.id, {
      attributes: ['coach_id', 'name', 'email', 'phone', 'profile_photo_url', 'status', 'created_at']
    });

    if (!coach) {
      return res.status(404).json({ message: 'Coach not found' });
    }

    res.json(coach);
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Create a coach
// @route   POST /api/coaches
// @access  Private/Admin
const createCoach = async (req, res) => {
  const { name, email, password, phone, profile_photo_url, status } = req.body;

  // Validation
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide name, email and password' });
  }

  try {
    // Check if coach exists
    const coachExists = await Coach.findOne({ where: { email } });
    if (coachExists) {
      return res.status(400).json({ message: 'Coach already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const coach = await Coach.create({
      name,
      email,
      password_hash: hashedPassword,
      phone,
      profile_photo_url,
      status: status || 'active'
    });

    res.status(201).json({
      coach_id: coach.coach_id,
      name: coach.name,
      email: coach.email,
      phone: coach.phone,
      status: coach.status
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update coach
// @route   PUT /api/coaches/:id
// @access  Private/Admin
const updateCoach = async (req, res) => {
  try {
    const coach = await Coach.findByPk(req.params.id);
    if (!coach) {
      return res.status(404).json({ message: 'Coach not found' });
    }

    // Update fields
    coach.name = req.body.name || coach.name;
    
    // Email update with validation
    if (req.body.email && req.body.email !== coach.email) {
      const emailExists = await Coach.findOne({ where: { email: req.body.email } });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      coach.email = req.body.email;
    }

    coach.phone = req.body.phone || coach.phone;
    coach.profile_photo_url = req.body.profile_photo_url || coach.profile_photo_url;
    coach.status = req.body.status || coach.status;

    // Password update
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      coach.password_hash = await bcrypt.hash(req.body.password, salt);
    }

    const updatedCoach = await coach.save();

    res.json({
      coach_id: updatedCoach.coach_id,
      name: updatedCoach.name,
      email: updatedCoach.email,
      phone: updatedCoach.phone,
      status: updatedCoach.status
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete coach
// @route   DELETE /api/coaches/:id
// @access  Private/Admin
const deleteCoach = async (req, res) => {
  try {
    const coach = await Coach.findByPk(req.params.id);
    if (!coach) {
      return res.status(404).json({ message: 'Coach not found' });
    }

    // Check for active subscriptions
    const activeSubscriptions = await Subscription.count({ 
      where: { 
        coach_id: coach.coach_id,
        status: 'active'
      }
    });

    if (activeSubscriptions > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete coach with active subscriptions' 
      });
    }

    await coach.destroy();
    res.json({ message: 'Coach removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get coach subscriptions
// @route   GET /api/coaches/:id/subscriptions
// @access  Private/Admin
const getCoachSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      where: { coach_id: req.params.id },
      include: [{
        association: 'plan',
        attributes: ['name', 'price', 'duration_days']
      }],
      order: [['start_date', 'DESC']]
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
  getCoaches,
  getCoachById,
  createCoach,
  updateCoach,
  deleteCoach,
  getCoachSubscriptions
};