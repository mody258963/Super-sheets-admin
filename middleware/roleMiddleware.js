/**
 * Role-based middleware for Super Sheets Admin
 * Supports roles: admin, finance, sales
 */

// Middleware to check if user has admin role
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  if (req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
};

// Middleware to check if user has finance role
const isFinance = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  if (req.user.role === 'finance' || req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Finance role required.' });
  }
};

// Middleware to check if user has sales role
const isSales = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  if (req.user.role === 'sales' || req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Sales role required.' });
  }
};

// Middleware to check if user has any of the specified roles
const hasRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Admin role has access to everything
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Check if user's role is in the allowed roles
    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ 
        message: `Access denied. Required role: ${roles.join(' or ')}.` 
      });
    }
  };
};

module.exports = {
  isAdmin,
  isFinance,
  isSales,
  hasRole
};
