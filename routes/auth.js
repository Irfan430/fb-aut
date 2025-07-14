const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 requests per windowMs for sensitive operations
  message: {
    success: false,
    message: 'Too many attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation middleware
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be 3-50 characters long and contain only letters, numbers, underscores, and hyphens'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 6 characters long and contain at least one lowercase letter, one uppercase letter, and one number')
];

const loginValidation = [
  body('identifier')
    .notEmpty()
    .trim()
    .withMessage('Email or username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const facebookLoginValidation = [
  body('fbEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid Facebook email is required'),
  body('fbPassword')
    .notEmpty()
    .withMessage('Facebook password is required')
];

const facebookCookiesValidation = [
  body('cookies')
    .notEmpty()
    .custom((value) => {
      try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error('Invalid cookies format');
        }
        // Check if cookies contain essential Facebook cookies
        const hasEssentialCookies = parsed.some(cookie => 
          cookie.name && (cookie.name.includes('c_user') || cookie.name.includes('xs'))
        );
        if (!hasEssentialCookies) {
          throw new Error('Essential Facebook cookies missing');
        }
        return true;
      } catch (error) {
        throw new Error('Invalid cookies format - must be valid JSON array of cookie objects');
      }
    })
    .withMessage('Valid Facebook cookies are required'),
  body('userAgent')
    .optional()
    .isLength({ min: 10, max: 500 })
    .withMessage('User agent must be between 10 and 500 characters')
];

/**
 * Authentication Routes
 */

// @route   GET /api/auth/check
// @desc    Check authentication status
// @access  Public
router.get('/check', authController.checkAuth);

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', authLimiter, registerValidation, authController.register);

// @route   POST /api/auth/login
// @desc    User login
// @access  Public
router.post('/login', authLimiter, loginValidation, authController.login);

// @route   POST /api/auth/logout
// @desc    User logout
// @access  Private
router.post('/logout', authController.requireAuth, authController.logout);

// @route   GET /api/auth/user
// @desc    Get current user info
// @access  Private
router.get('/user', authController.requireAuth, authController.getCurrentUser);

/**
 * Facebook Session Management Routes
 */

// @route   POST /api/auth/facebook/login
// @desc    Add Facebook session using credentials
// @access  Private
router.post('/facebook/login', 
  strictAuthLimiter, 
  authController.requireAuth, 
  facebookLoginValidation, 
  authController.facebookLogin
);

// @route   POST /api/auth/facebook/cookies
// @desc    Add Facebook session using cookies
// @access  Private
router.post('/facebook/cookies', 
  authController.requireAuth, 
  facebookCookiesValidation, 
  authController.addFacebookCookies
);

// @route   GET /api/auth/facebook/sessions
// @desc    Get user's Facebook sessions
// @access  Private
router.get('/facebook/sessions', 
  authController.requireAuth, 
  authController.getFacebookSessions
);

// @route   DELETE /api/auth/facebook/sessions/:sessionId
// @desc    Remove Facebook session
// @access  Private
router.delete('/facebook/sessions/:sessionId', 
  authController.requireAuth, 
  authController.removeFacebookSession
);

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  console.error('❌ Auth route error:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Authentication service error',
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
  });
});

module.exports = router;