const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/adminModel');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Register a new admin
// @route   POST /api/admins/register
// @access  Public
const registerAdmin = async (req, res) => {
  const { name, email, password, role } = req.body;

  // Basic validation
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  try {
    const adminExists = await Admin.findOne({ where: { email } });

    if (adminExists) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = await Admin.create({
      name,
      email,
      password_hash: hashedPassword,
      role: role || 'admin'
    });

    if (admin) {
      res.status(201).json({
        admin_id: admin.admin_id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        token: generateToken(admin.admin_id)
      });
    } else {
      res.status(400).json({ message: 'Invalid admin data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Authenticate admin & get token
// @route   POST /api/admins/login
// @access  Public
const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  try {
    const admin = await Admin.findOne({ where: { email } });

    if (admin && (await bcrypt.compare(password, admin.password_hash))) {
      res.json({
        admin_id: admin.admin_id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        token: generateToken(admin.admin_id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all admins
// @route   GET /api/admins
// @access  Private/Admin
const getAdmins = async (req, res) => {
  try {
    const admins = await Admin.findAll({
      attributes: ['admin_id', 'name', 'email', 'role', 'created_at'],
      order: [['created_at', 'DESC']]
    });
    res.json(admins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get admin by ID
// @route   GET /api/admins/:id
// @access  Private/Admin
const getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.params.id, {
      attributes: ['admin_id', 'name', 'email', 'role', 'created_at']
    });

    if (admin) {
      res.json(admin);
    } else {
      res.status(404).json({ message: 'Admin not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update admin
// @route   PUT /api/admins/:id
// @access  Private/Admin
const updateAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.params.id);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Prevent updating super admin if you have one
    if (admin.role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to update this admin' });
    }

    // Update fields
    admin.name = req.body.name || admin.name;
    
    // Only allow email update if it's not already taken
    if (req.body.email && req.body.email !== admin.email) {
      const emailExists = await Admin.findOne({ where: { email: req.body.email } });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      admin.email = req.body.email;
    }

    // Only allow role change for superadmin or if not changing own role
    if (req.body.role && (req.user.role === 'superadmin' || req.user.admin_id !== admin.admin_id)) {
      admin.role = req.body.role;
    }

    // Update password if provided
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      admin.password_hash = await bcrypt.hash(req.body.password, salt);
    }

    const updatedAdmin = await admin.save();

    res.json({
      admin_id: updatedAdmin.admin_id,
      name: updatedAdmin.name,
      email: updatedAdmin.email,
      role: updatedAdmin.role,
      created_at: updatedAdmin.created_at
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete admin
// @route   DELETE /api/admins/:id
// @access  Private/Admin
const deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.params.id);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Prevent deleting self or superadmin
    if (admin.admin_id === req.user.admin_id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    if (admin.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot delete superadmin' });
    }

    await admin.destroy();
    res.json({ message: 'Admin removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  registerAdmin,
  loginAdmin,
  getAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin
};