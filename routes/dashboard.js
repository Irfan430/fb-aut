const express = require('express');
const { query } = require('express-validator');
const dashboardController = require('../controllers/dashboardController');
const authController = require('../controllers/authController');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for dashboard endpoints
const dashboardLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each user to 30 requests per minute
  message: {
    success: false,
    message: 'Too many dashboard requests, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.session.userId || req.ip
});

// Validation middleware
const activityFeedValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

/**
 * Dashboard UI Routes
 */

// @route   GET /dashboard
// @desc    Render dashboard page
// @access  Private
router.get('/', authController.requireAuth, dashboardController.renderDashboard);

/**
 * Dashboard API Routes
 */

// @route   GET /api/dashboard/data
// @desc    Get dashboard data
// @access  Private
router.get('/data', 
  authController.requireAuth,
  dashboardLimiter,
  dashboardController.getDashboardDataAPI
);

// @route   GET /api/dashboard/activity
// @desc    Get recent activity feed
// @access  Private
router.get('/activity',
  authController.requireAuth,
  dashboardLimiter,
  activityFeedValidation,
  dashboardController.getActivityFeed
);

/**
 * System Monitoring Routes
 */

// @route   GET /api/dashboard/health
// @desc    Get system health status
// @access  Public (for monitoring services)
router.get('/health', dashboardController.getHealthCheck);

// @route   GET /api/dashboard/system-stats
// @desc    Get system statistics (admin only)
// @access  Private (Admin)
router.get('/system-stats',
  authController.requireAuth,
  authController.requireAdmin,
  dashboardController.getSystemStats
);

// @route   POST /api/dashboard/clean-sessions
// @desc    Clean expired sessions for all users (admin only)
// @access  Private (Admin)
router.post('/clean-sessions',
  authController.requireAuth,
  authController.requireAdmin,
  dashboardController.cleanExpiredSessions
);

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  console.error('❌ Dashboard route error:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Dashboard service error',
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
  });
});

module.exports = router;