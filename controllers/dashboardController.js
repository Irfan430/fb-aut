const User = require('../models/User');
const facebookService = require('../services/fbService');

/**
 * Dashboard Controller
 * Handles dashboard rendering and data aggregation
 */
class DashboardController {

  /**
   * Render dashboard page
   */
  async renderDashboard(req, res) {
    try {
      // Check if user is authenticated
      if (!req.session.userId) {
        return res.redirect('/login.html');
      }

      const user = await User.findById(req.session.userId);
      if (!user) {
        req.session.destroy();
        return res.redirect('/login.html');
      }

      // Clean expired sessions
      await user.cleanExpiredSessions();

      // Get dashboard data
      const dashboardData = await this.getDashboardData(user);

      // Render dashboard
      res.render('dashboard', {
        title: 'Facebook Auto Tool - Dashboard',
        user: {
          username: user.username,
          email: user.email,
          role: user.role
        },
        ...dashboardData
      });

    } catch (error) {
      console.error('❌ Dashboard render error:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to load dashboard',
        error: error.message
      });
    }
  }

  /**
   * Get dashboard data (API endpoint)
   */
  async getDashboardDataAPI(req, res) {
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

      // Get dashboard data
      const dashboardData = await this.getDashboardData(user);

      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      console.error('❌ Dashboard data API error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get dashboard data',
        error: error.message
      });
    }
  }

  /**
   * Get aggregated dashboard data
   */
  async getDashboardData(user) {
    // Clean expired sessions first
    await user.cleanExpiredSessions();

    // Get active sessions with masked IDs
    const activeSessions = user.getMaskedFacebookIds();

    // Get recent actions
    const recentActions = user.getRecentActions(10);

    // Calculate action statistics
    const totalActions = user.actionHistory.length;
    const successfulActions = user.actionHistory.filter(action => action.status === 'success').length;
    const failedActions = user.actionHistory.filter(action => action.status === 'failed').length;
    const successRate = totalActions > 0 ? (successfulActions / totalActions * 100).toFixed(1) : 0;

    // Action type distribution
    const actionTypeStats = {};
    user.actionHistory.forEach(action => {
      actionTypeStats[action.actionType] = (actionTypeStats[action.actionType] || 0) + 1;
    });

    // Recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const todayActions = user.actionHistory.filter(action => 
      action.executedAt && action.executedAt > yesterday
    );

    // Weekly activity
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyActions = user.actionHistory.filter(action => 
      action.executedAt && action.executedAt > weekAgo
    );

    // System status
    const systemStatus = await this.getSystemStatus();

    return {
      // User info
      user: {
        username: user.username,
        email: user.email,
        lastLogin: user.lastLogin,
        memberSince: user.createdAt
      },

      // Session statistics
      sessions: {
        active: activeSessions,
        totalActive: activeSessions.length,
        maxAllowed: user.preferences.maxConcurrentSessions
      },

      // Action statistics
      actions: {
        total: totalActions,
        successful: successfulActions,
        failed: failedActions,
        successRate: parseFloat(successRate),
        recent: recentActions,
        today: todayActions.length,
        thisWeek: weeklyActions.length,
        typeDistribution: actionTypeStats
      },

      // System info
      system: systemStatus,

      // Quick stats for cards
      stats: {
        activeSessions: activeSessions.length,
        todayActions: todayActions.length,
        successRate: parseFloat(successRate),
        totalActions: totalActions
      }
    };
  }

  /**
   * Get system status information
   */
  async getSystemStatus() {
    try {
      // Get Facebook service status
      const fbServiceStats = facebookService.getSessionStats();
      const fbHealthCheck = await facebookService.healthCheck();

      // Get database status
      const dbStatus = require('../config/db').getConnectionStatus();

      return {
        facebook: {
          service: fbServiceStats,
          health: fbHealthCheck,
          operational: fbHealthCheck.healthy && fbServiceStats.isInitialized
        },
        database: {
          connected: dbStatus.isConnected,
          readyState: dbStatus.readyState,
          host: dbStatus.host
        },
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version
        }
      };
    } catch (error) {
      console.error('❌ System status error:', error);
      return {
        facebook: { operational: false, error: error.message },
        database: { connected: false },
        server: { uptime: process.uptime() }
      };
    }
  }

  /**
   * Get health check data
   */
  async getHealthCheck(req, res) {
    try {
      const systemStatus = await this.getSystemStatus();
      const isHealthy = systemStatus.facebook.operational && systemStatus.database.connected;

      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        timestamp: new Date().toISOString(),
        status: isHealthy ? 'healthy' : 'unhealthy',
        services: systemStatus
      });

    } catch (error) {
      console.error('❌ Health check error:', error);
      res.status(503).json({
        success: false,
        timestamp: new Date().toISOString(),
        status: 'unhealthy',
        error: error.message
      });
    }
  }

  /**
   * Get system statistics (admin only)
   */
  async getSystemStats(req, res) {
    try {
      // Check admin access
      if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      // Get all users statistics
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ isActive: true });
      const usersWithSessions = await User.countDocuments({
        'facebookSessions.isActive': true
      });

      // Get total actions across all users
      const allUsers = await User.find({}, 'actionHistory');
      let totalActions = 0;
      let successfulActions = 0;
      let failedActions = 0;

      allUsers.forEach(user => {
        totalActions += user.actionHistory.length;
        successfulActions += user.actionHistory.filter(a => a.status === 'success').length;
        failedActions += user.actionHistory.filter(a => a.status === 'failed').length;
      });

      // System status
      const systemStatus = await this.getSystemStatus();

      res.json({
        success: true,
        data: {
          users: {
            total: totalUsers,
            active: activeUsers,
            withSessions: usersWithSessions
          },
          actions: {
            total: totalActions,
            successful: successfulActions,
            failed: failedActions,
            successRate: totalActions > 0 ? (successfulActions / totalActions * 100).toFixed(1) : 0
          },
          system: systemStatus
        }
      });

    } catch (error) {
      console.error('❌ System stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get system statistics',
        error: error.message
      });
    }
  }

  /**
   * Clean expired sessions for all users (admin endpoint)
   */
  async cleanExpiredSessions(req, res) {
    try {
      // Check admin access
      if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      await User.cleanAllExpiredSessions();

      res.json({
        success: true,
        message: 'Expired sessions cleaned successfully'
      });

    } catch (error) {
      console.error('❌ Clean expired sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clean expired sessions',
        error: error.message
      });
    }
  }

  /**
   * Get recent activity feed
   */
  async getActivityFeed(req, res) {
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

      const { limit = 20 } = req.query;
      const recentActions = user.getRecentActions(parseInt(limit));

      // Format for activity feed
      const activities = recentActions.map(action => ({
        id: action.actionId,
        type: action.actionType,
        target: action.targetId,
        status: action.status,
        timestamp: action.executedAt,
        description: this.formatActionDescription(action),
        icon: this.getActionIcon(action.actionType),
        success: action.status === 'success'
      }));

      res.json({
        success: true,
        data: {
          activities,
          total: activities.length
        }
      });

    } catch (error) {
      console.error('❌ Activity feed error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get activity feed',
        error: error.message
      });
    }
  }

  /**
   * Format action description for activity feed
   */
  formatActionDescription(action) {
    const actionNames = {
      like: 'liked',
      love: 'reacted with ❤️ to',
      haha: 'reacted with 😂 to',
      wow: 'reacted with 😮 to',
      sad: 'reacted with 😢 to',
      angry: 'reacted with 😡 to',
      follow: 'followed',
      comment: 'commented on'
    };

    const actionText = actionNames[action.actionType] || action.actionType;
    const targetType = action.targetType === 'post' ? 'post' : 'profile';
    
    return `${actionText} ${targetType} ${action.targetId}`;
  }

  /**
   * Get icon for action type
   */
  getActionIcon(actionType) {
    const icons = {
      like: '👍',
      love: '❤️',
      haha: '😂',
      wow: '😮',
      sad: '😢',
      angry: '😡',
      follow: '➕',
      comment: '💬'
    };

    return icons[actionType] || '⚡';
  }
}

module.exports = new DashboardController();