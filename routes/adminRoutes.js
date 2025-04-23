const express = require('express');
const router = express.Router();
const { 
  registerAdmin, 
  loginAdmin, 
  getAdmins, 
  getAdminById, 
  updateAdmin, 
  deleteAdmin 
} = require('../controllers/AdminController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', protect, admin, registerAdmin);
router.post('/login', loginAdmin);

// Protected admin routes
router.route('/')
  .get(protect, admin, getAdmins);

router.route('/:id')
  .get(protect, admin, getAdminById)
  .put(protect, admin, updateAdmin)
  .delete(protect, admin, deleteAdmin);

module.exports = router;
