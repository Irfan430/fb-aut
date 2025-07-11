const User = require('../models/User');
const facebookService = require('../services/fbService');
const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

/**
 * Action Controller
 * Handles Facebook action execution and management
 */
class ActionController {

  /**
   * Execute Facebook action
   */
  async executeAction(req, res) {
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

      const { targetId, targetType, actionType, comment } = req.body;
      const user = await User.findById(req.session.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get active Facebook sessions
      const activeSessions = user.getActiveFacebookSessions();
      if (activeSessions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No active Facebook sessions available. Please add a Facebook account first.'
        });
      }

      // Validate comment if action type is comment
      if (actionType === 'comment' && (!comment || comment.trim().length === 0)) {
        return res.status(400).json({
          success: false,
          message: 'Comment text is required for comment action'
        });
      }

      // Generate action ID
      const actionId = uuidv4();

      // Prepare action data
      const actionData = {
        actionId,
        actionType,
        targetId: this.extractTargetId(targetId),
        targetType: this.determineTargetType(targetId, targetType),
        comment: comment ? comment.trim() : undefined,
        status: 'pending',
        executedAt: new Date()
      };

      // Log action attempt
      console.log(`🎯 Executing ${actionType} action for user: ${user.username}, target: ${actionData.targetId}`);

      // Try each active session until one succeeds
      let lastError = null;
      let actionResult = null;
      let successfulSession = null;

      for (const session of activeSessions) {
        try {
          // Attempt action with this session
          actionResult = await facebookService.performAction(session, actionData);
          
          if (actionResult.success) {
            successfulSession = session;
            break;
          } else {
            lastError = actionResult.error;
            
            // If session is invalid, deactivate it
            if (actionResult.error && actionResult.error.includes('Session expired')) {
              await user.deactivateSession(session.fbUserId);
              console.log(`⚠️ Deactivated expired session for FB ID: ${user.maskFacebookId(session.fbUserId)}`);
            }
          }
        } catch (error) {
          lastError = error.message;
          console.error(`❌ Action failed with session ${user.maskFacebookId(session.fbUserId)}:`, error);
        }
      }

      // Update action data with result
      if (actionResult && actionResult.success) {
        actionData.status = 'success';
        actionData.executedBy = {
          fbUserId: successfulSession.fbUserId,
          sessionId: successfulSession._id.toString()
        };
      } else {
        actionData.status = 'failed';
        actionData.error = lastError || 'All sessions failed';
      }

      // Add action to user history
      await user.addActionHistory(actionData);

      // Send response
      if (actionResult && actionResult.success) {
        console.log(`✅ ${actionType} action completed successfully for user: ${user.username}`);
        
        res.json({
          success: true,
          message: `${actionType} action completed successfully`,
          data: {
            actionId: actionData.actionId,
            actionType: actionData.actionType,
            targetId: actionData.targetId,
            targetType: actionData.targetType,
            executedBy: user.maskFacebookId(successfulSession.fbUserId),
            executedAt: actionData.executedAt
          }
        });
      } else {
        console.log(`❌ ${actionType} action failed for user: ${user.username}, error: ${lastError}`);
        
        res.status(400).json({
          success: false,
          message: `${actionType} action failed`,
          error: lastError,
          data: {
            actionId: actionData.actionId,
            availableSessions: user.getActiveFacebookSessions().length
          }
        });
      }

    } catch (error) {
      console.error('❌ Execute action error:', error);
      res.status(500).json({
        success: false,
        message: 'Action execution failed',
        error: error.message
      });
    }
  }

  /**
   * Get action history
   */
  async getActionHistory(req, res) {
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

      const { limit = 20, offset = 0 } = req.query;
      const recentActions = user.getRecentActions(parseInt(limit));

      // Apply offset
      const actions = recentActions.slice(parseInt(offset));

      res.json({
        success: true,
        data: {
          actions,
          total: user.actionHistory.length,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });

    } catch (error) {
      console.error('❌ Get action history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get action history',
        error: error.message
      });
    }
  }

  /**
   * Get action statistics
   */
  async getActionStats(req, res) {
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

      // Calculate statistics
      const totalActions = user.actionHistory.length;
      const successfulActions = user.actionHistory.filter(action => action.status === 'success').length;
      const failedActions = user.actionHistory.filter(action => action.status === 'failed').length;
      const pendingActions = user.actionHistory.filter(action => action.status === 'pending').length;

      // Action type distribution
      const actionTypeStats = {};
      user.actionHistory.forEach(action => {
        actionTypeStats[action.actionType] = (actionTypeStats[action.actionType] || 0) + 1;
      });

      // Recent activity (last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentActions = user.actionHistory.filter(action => 
        action.executedAt && action.executedAt > yesterday
      ).length;

      res.json({
        success: true,
        data: {
          totalActions,
          successfulActions,
          failedActions,
          pendingActions,
          successRate: totalActions > 0 ? (successfulActions / totalActions * 100).toFixed(2) : 0,
          actionTypeStats,
          recentActions,
          activeSessions: user.getActiveFacebookSessions().length
        }
      });

    } catch (error) {
      console.error('❌ Get action stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get action statistics',
        error: error.message
      });
    }
  }

  /**
   * Retry failed action
   */
  async retryAction(req, res) {
    try {
      // Check if user is authenticated
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const { actionId } = req.params;
      const user = await User.findById(req.session.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Find the failed action
      const failedAction = user.actionHistory.find(action => 
        action.actionId === actionId && action.status === 'failed'
      );

      if (!failedAction) {
        return res.status(404).json({
          success: false,
          message: 'Failed action not found'
        });
      }

      // Retry the action by calling executeAction with the same parameters
      req.body = {
        targetId: failedAction.targetId,
        targetType: failedAction.targetType,
        actionType: failedAction.actionType,
        comment: failedAction.comment
      };

      return this.executeAction(req, res);

    } catch (error) {
      console.error('❌ Retry action error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retry action',
        error: error.message
      });
    }
  }

  /**
   * Get supported action types
   */
  getSupportedActions(req, res) {
    const supportedActions = [
      {
        type: 'like',
        name: 'Like',
        description: 'Like a post or page',
        requiresComment: false,
        icon: '👍'
      },
      {
        type: 'love',
        name: 'Love',
        description: 'React with love emoji',
        requiresComment: false,
        icon: '❤️'
      },
      {
        type: 'haha',
        name: 'Haha',
        description: 'React with laugh emoji',
        requiresComment: false,
        icon: '😂'
      },
      {
        type: 'wow',
        name: 'Wow',
        description: 'React with wow emoji',
        requiresComment: false,
        icon: '😮'
      },
      {
        type: 'sad',
        name: 'Sad',
        description: 'React with sad emoji',
        requiresComment: false,
        icon: '😢'
      },
      {
        type: 'angry',
        name: 'Angry',
        description: 'React with angry emoji',
        requiresComment: false,
        icon: '😡'
      },
      {
        type: 'follow',
        name: 'Follow',
        description: 'Follow a user or page',
        requiresComment: false,
        icon: '➕'
      },
      {
        type: 'comment',
        name: 'Comment',
        description: 'Post a comment',
        requiresComment: true,
        icon: '💬'
      }
    ];

    res.json({
      success: true,
      data: {
        actions: supportedActions,
        total: supportedActions.length
      }
    });
  }

  /**
   * Validate target URL/ID
   */
  async validateTarget(req, res) {
    try {
      const { targetId } = req.body;
      
      if (!targetId) {
        return res.status(400).json({
          success: false,
          message: 'Target ID is required'
        });
      }

      const extractedId = this.extractTargetId(targetId);
      const targetType = this.determineTargetType(targetId);

      res.json({
        success: true,
        data: {
          originalInput: targetId,
          extractedId,
          targetType,
          isValid: !!extractedId
        }
      });

    } catch (error) {
      console.error('❌ Validate target error:', error);
      res.status(500).json({
        success: false,
        message: 'Target validation failed',
        error: error.message
      });
    }
  }

  /**
   * Extract target ID from URL or return as-is if already an ID
   */
  extractTargetId(input) {
    if (!input) return null;

    // If it's already a numeric ID, return it
    if (/^\d+$/.test(input.trim())) {
      return input.trim();
    }

    // Extract from Facebook URLs
    const patterns = [
      // Post URLs
      /facebook\.com\/[^\/]+\/posts\/(\d+)/,
      /facebook\.com\/photo\.php\?fbid=(\d+)/,
      /facebook\.com\/[^\/]+\/photos\/[^\/]+\/(\d+)/,
      // Profile URLs
      /facebook\.com\/profile\.php\?id=(\d+)/,
      /facebook\.com\/([^\/\?]+)/,
      // Story URLs
      /facebook\.com\/stories\/(\d+)/
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Return the input as-is if no patterns match
    return input.trim();
  }

  /**
   * Determine target type based on URL pattern
   */
  determineTargetType(input, explicitType = null) {
    if (explicitType) return explicitType;

    if (!input) return 'post';

    // Check URL patterns to determine type
    if (input.includes('/posts/') || 
        input.includes('/photo.php') || 
        input.includes('/photos/') ||
        input.includes('/stories/')) {
      return 'post';
    } else if (input.includes('/profile.php') || 
               input.includes('facebook.com/') && !input.includes('/posts/')) {
      return 'user';
    }

    // Default to post for ambiguous cases
    return 'post';
  }
}

module.exports = new ActionController();