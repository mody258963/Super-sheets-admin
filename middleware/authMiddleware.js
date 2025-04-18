const jwt = require('jsonwebtoken');
const Admin = require('../models/adminModel');

// Load environment variable or set default
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Middleware to protect routes - verify token and add user to req
const protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user from token
    const user = await Admin.findByPk(decoded.id, {
      attributes: ['admin_id', 'name', 'email', 'role']
    });

    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    // Set user in request
    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

// Middleware to check if user is admin
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

// Middleware to check if user is finance
const finance = (req, res, next) => {
  if (req.user && (req.user.role === 'finance' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as finance' });
  }
};

// Middleware to check if user is sales
const sales = (req, res, next) => {
  if (req.user && (req.user.role === 'sales' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as sales' });
  }
};

module.exports = { protect, admin, finance, sales };
