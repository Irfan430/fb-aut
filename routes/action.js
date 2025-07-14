const express = require('express');
const { body, param, query } = require('express-validator');
const actionController = require('../controllers/actionController');
const authController = require('../controllers/authController');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for action endpoints
const actionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each user to 10 actions per 5 minutes
  message: {
    success: false,
    message: 'Too many actions performed, please wait before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.session.userId || req.ip // Rate limit per user, not IP
});

const strictActionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3, // limit to 3 actions per minute for sensitive operations
  message: {
    success: false,
    message: 'Action rate limit exceeded. Please wait before performing more actions.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.session.userId || req.ip
});

// Validation middleware
const executeActionValidation = [
  body('targetId')
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Target ID or URL is required and must be between 1-500 characters'),
  body('actionType')
    .isIn(['like', 'love', 'haha', 'wow', 'sad', 'angry', 'follow', 'comment'])
    .withMessage('Invalid action type'),
  body('targetType')
    .optional()
    .isIn(['post', 'user', 'page'])
    .withMessage('Invalid target type'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Comment must be less than 2000 characters'),
  // Custom validation for comment requirement
  body('comment').custom((value, { req }) => {
    if (req.body.actionType === 'comment' && (!value || value.trim().length === 0)) {
      throw new Error('Comment text is required for comment action');
    }
    return true;
  })
];

const validateTargetValidation = [
  body('targetId')
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Target ID or URL is required')
];

const historyQueryValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

const retryActionValidation = [
  param('actionId')
    .isUUID()
    .withMessage('Invalid action ID format')
];

/**
 * Action Execution Routes
 */

// @route   POST /api/actions/execute
// @desc    Execute Facebook action
// @access  Private
router.post('/execute', 
  authController.requireAuth,
  actionLimiter,
  executeActionValidation,
  actionController.executeAction
);

// @route   POST /api/actions/validate-target
// @desc    Validate target URL/ID
// @access  Private
router.post('/validate-target',
  authController.requireAuth,
  validateTargetValidation,
  actionController.validateTarget
);

/**
 * Action History Routes
 */

// @route   GET /api/actions/history
// @desc    Get action history
// @access  Private
router.get('/history',
  authController.requireAuth,
  historyQueryValidation,
  actionController.getActionHistory
);

// @route   GET /api/actions/stats
// @desc    Get action statistics
// @access  Private
router.get('/stats',
  authController.requireAuth,
  actionController.getActionStats
);

// @route   POST /api/actions/retry/:actionId
// @desc    Retry failed action
// @access  Private
router.post('/retry/:actionId',
  authController.requireAuth,
  strictActionLimiter,
  retryActionValidation,
  actionController.retryAction
);

/**
 * Action Information Routes
 */

// @route   GET /api/actions/supported
// @desc    Get supported action types
// @access  Public
router.get('/supported', actionController.getSupportedActions);

/**
 * Middleware for request logging
 */
router.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/execute') {
    const { actionType, targetType } = req.body;
    const userId = req.session.userId;
    console.log(`📊 Action request: ${actionType} on ${targetType} by user ${userId}`);
  }
  next();
});

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  console.error('❌ Action route error:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body'
    });
  }
  
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request payload too large'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Action service error',
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
  });
});

module.exports = router;