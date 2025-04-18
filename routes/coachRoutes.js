const express = require('express');
const router = express.Router();
const { 
  getCoaches, 
  getCoachById, 
  createCoach, 
  updateCoach, 
  deleteCoach,
  getCoachSubscriptions
} = require('../controllers/CoachController');
const { protect, admin } = require('../middleware/authMiddleware');

// All routes are protected
router.route('/')
  .get(protect, admin, getCoaches)
  .post(protect, admin, createCoach);

router.route('/:id')
  .get(protect, admin, getCoachById)
  .put(protect, admin, updateCoach)
  .delete(protect, admin, deleteCoach);

router.route('/:id/subscriptions')
  .get(protect, admin, getCoachSubscriptions);

module.exports = router;
