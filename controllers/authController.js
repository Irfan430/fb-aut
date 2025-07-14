const User = require('../models/User');
const facebookService = require('../services/fbService');
const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

/**
 * Authentication Controller
 * Handles user authentication, registration, and Facebook session management
 */
class AuthController {
  
  /**
   * Register new user
   */
  async register(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { username, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmailOrUsername(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User already exists with this email or username'
        });
      }

      // Create new user
      const user = new User({
        username: username.trim(),
        email: email.toLowerCase().trim(),
        password
      });

      await user.save();

      // Log the registration
      console.log(`✅ New user registered: ${username} (${email})`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          userId: user._id,
          username: user.username,
          email: user.email
        }
      });

    } catch (error) {
      console.error('❌ Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  }

  /**
   * User login
   */
  async login(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { identifier, password } = req.body; // identifier can be email or username

      // Find user
      const user = await User.findByEmailOrUsername(identifier);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Update last login
      await user.updateLastLogin();

      // Clean expired sessions
      await user.cleanExpiredSessions();

      // Create session
      req.session.userId = user._id;
      req.session.username = user.username;
      req.session.role = user.role;

      console.log(`✅ User logged in: ${user.username}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          userId: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          activeSessions: user.getActiveFacebookSessions().length,
          lastLogin: user.lastLogin
        }
      });

    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  }

  /**
   * Facebook login with credentials
   */
  async facebookLogin(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      // Check if user is authenticated
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const { fbEmail, fbPassword } = req.body;
      const user = await User.findById(req.session.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Attempt Facebook login
      console.log(`🔐 Attempting Facebook login for user: ${user.username}`);
      const loginResult = await facebookService.loginWithCredentials(fbEmail, fbPassword);

      if (!loginResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Facebook login failed',
          error: loginResult.error
        });
      }

      // Add Facebook session to user
      await user.addFacebookSession({
        fbUserId: loginResult.fbUserId,
        cookies: loginResult.cookies,
        userAgent: loginResult.userAgent
      });

      console.log(`✅ Facebook session added for user: ${user.username}, FB ID: ${user.maskFacebookId(loginResult.fbUserId)}`);

      res.json({
        success: true,
        message: 'Facebook session added successfully',
        data: {
          fbUserId: user.maskFacebookId(loginResult.fbUserId),
          activeSessions: user.getActiveFacebookSessions().length
        }
      });

    } catch (error) {
      console.error('❌ Facebook login error:', error);
      res.status(500).json({
        success: false,
        message: 'Facebook login failed',
        error: error.message
      });
    }
  }

  /**
   * Add Facebook session using cookies
   */
  async addFacebookCookies(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      // Check if user is authenticated
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const { cookies, userAgent } = req.body;
      const user = await User.findById(req.session.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Validate cookies
      console.log(`🍪 Validating Facebook cookies for user: ${user.username}`);
      const validationResult = await facebookService.validateCookies(
        cookies, 
        userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      );

      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Facebook cookies',
          error: validationResult.error
        });
      }

      // Add Facebook session to user
      await user.addFacebookSession({
        fbUserId: validationResult.fbUserId,
        cookies: cookies,
        userAgent: userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });

      console.log(`✅ Facebook cookies added for user: ${user.username}, FB ID: ${user.maskFacebookId(validationResult.fbUserId)}`);

      res.json({
        success: true,
        message: 'Facebook session added successfully',
        data: {
          fbUserId: user.maskFacebookId(validationResult.fbUserId),
          activeSessions: user.getActiveFacebookSessions().length
        }
      });

    } catch (error) {
      console.error('❌ Add Facebook cookies error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add Facebook cookies',
        error: error.message
      });
    }
  }

  /**
   * Remove Facebook session
   */
  async removeFacebookSession(req, res) {
    try {
      // Check if user is authenticated
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const { sessionId } = req.params;
      const user = await User.findById(req.session.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Find and remove session
      const sessionIndex = user.facebookSessions.findIndex(
        session => session._id.toString() === sessionId
      );

      if (sessionIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      const removedSession = user.facebookSessions[sessionIndex];
      user.facebookSessions.splice(sessionIndex, 1);
      await user.save();

      console.log(`🗑️ Facebook session removed for user: ${user.username}, FB ID: ${user.maskFacebookId(removedSession.fbUserId)}`);

      res.json({
        success: true,
        message: 'Facebook session removed successfully',
        data: {
          activeSessions: user.getActiveFacebookSessions().length
        }
      });

    } catch (error) {
      console.error('❌ Remove Facebook session error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove Facebook session',
        error: error.message
      });
    }
  }

  /**
   * Get user's Facebook sessions
   */
  async getFacebookSessions(req, res) {
    try {
      // Check if user is authenticated
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const user = await User.findById(req.session.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Clean expired sessions first
      await user.cleanExpiredSessions();

      const maskedSessions = user.getMaskedFacebookIds();

      res.json({
        success: true,
        data: {
          sessions: maskedSessions,
          totalSessions: maskedSessions.length,
          maxSessions: user.preferences.maxConcurrentSessions
        }
      });

    } catch (error) {
      console.error('❌ Get Facebook sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get Facebook sessions',
        error: error.message
      });
    }
  }

  /**
   * Logout user
   */
  async logout(req, res) {
    try {
      const username = req.session.username;

      req.session.destroy((err) => {
        if (err) {
          console.error('❌ Session destruction error:', err);
          return res.status(500).json({
            success: false,
            message: 'Logout failed'
          });
        }

        res.clearCookie('connect.sid');
        console.log(`👋 User logged out: ${username}`);

        res.json({
          success: true,
          message: 'Logout successful'
        });
      });

    } catch (error) {
      console.error('❌ Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error.message
      });
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(req, res) {
    try {
      // Check if user is authenticated
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const user = await User.findById(req.session.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Clean expired sessions
      await user.cleanExpiredSessions();

      res.json({
        success: true,
        data: {
          userId: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          activeSessions: user.getActiveFacebookSessions().length,
          recentActions: user.getRecentActions(5),
          preferences: user.preferences
        }
      });

    } catch (error) {
      console.error('❌ Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user info',
        error: error.message
      });
    }
  }

  /**
   * Check authentication status
   */
  checkAuth(req, res) {
    res.json({
      success: true,
      authenticated: !!req.session.userId,
      user: req.session.userId ? {
        userId: req.session.userId,
        username: req.session.username,
        role: req.session.role
      } : null
    });
  }

  /**
   * Middleware to require authentication
   */
  requireAuth(req, res, next) {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    next();
  }

  /**
   * Middleware to require admin role
   */
  requireAdmin(req, res, next) {
    if (!req.session.userId || req.session.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  }
}

module.exports = new AuthController();