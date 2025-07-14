const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const moment = require('moment');

/**
 * Facebook Session Schema
 * Stores encrypted Facebook cookies and session data
 */
const facebookSessionSchema = new mongoose.Schema({
  fbUserId: {
    type: String,
    required: true,
    index: true
  },
  cookies: {
    type: String, // Encrypted JSON string of cookies
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  lastValidated: {
    type: Date,
    default: Date.now
  },
  failureCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  }
}, {
  timestamps: true
});

/**
 * Action History Schema
 * Tracks all Facebook actions performed
 */
const actionHistorySchema = new mongoose.Schema({
  actionId: {
    type: String,
    required: true,
    unique: true
  },
  actionType: {
    type: String,
    required: true,
    enum: ['like', 'love', 'haha', 'sad', 'angry', 'wow', 'follow', 'comment']
  },
  targetId: {
    type: String,
    required: true
  },
  targetType: {
    type: String,
    required: true,
    enum: ['post', 'user', 'page']
  },
  comment: {
    type: String
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  executedBy: {
    fbUserId: String,
    sessionId: String
  },
  error: {
    type: String
  },
  executedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

/**
 * User Schema
 * Main user model with authentication and session management
 */
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  facebookSessions: [facebookSessionSchema],
  actionHistory: [actionHistorySchema],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  preferences: {
    autoCleanExpiredSessions: {
      type: Boolean,
      default: true
    },
    maxConcurrentSessions: {
      type: Number,
      default: 10
    },
    notifications: {
      email: {
        type: Boolean,
        default: false
      },
      actionFailures: {
        type: Boolean,
        default: true
      }
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'facebookSessions.fbUserId': 1 });
userSchema.index({ 'facebookSessions.isActive': 1 });
userSchema.index({ 'actionHistory.executedAt': -1 });

/**
 * Pre-save middleware to hash password
 */
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compare password method
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Add Facebook session
 */
userSchema.methods.addFacebookSession = function(sessionData) {
  // Remove existing session for the same FB user
  this.facebookSessions = this.facebookSessions.filter(
    session => session.fbUserId !== sessionData.fbUserId
  );
  
  // Add new session
  this.facebookSessions.push({
    fbUserId: sessionData.fbUserId,
    cookies: sessionData.cookies,
    userAgent: sessionData.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  
  // Limit sessions per user preferences
  if (this.facebookSessions.length > this.preferences.maxConcurrentSessions) {
    this.facebookSessions = this.facebookSessions
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, this.preferences.maxConcurrentSessions);
  }
  
  return this.save();
};

/**
 * Get active Facebook sessions
 */
userSchema.methods.getActiveFacebookSessions = function() {
  return this.facebookSessions.filter(session => 
    session.isActive && 
    session.expiresAt > new Date()
  );
};

/**
 * Deactivate Facebook session
 */
userSchema.methods.deactivateSession = function(fbUserId) {
  const session = this.facebookSessions.find(s => s.fbUserId === fbUserId);
  if (session) {
    session.isActive = false;
    session.failureCount += 1;
    return this.save();
  }
  return Promise.resolve();
};

/**
 * Add action to history
 */
userSchema.methods.addActionHistory = function(actionData) {
  this.actionHistory.push(actionData);
  
  // Keep only last 100 actions
  if (this.actionHistory.length > 100) {
    this.actionHistory = this.actionHistory
      .sort((a, b) => b.executedAt - a.executedAt)
      .slice(0, 100);
  }
  
  return this.save();
};

/**
 * Clean expired sessions
 */
userSchema.methods.cleanExpiredSessions = function() {
  if (!this.preferences.autoCleanExpiredSessions) return Promise.resolve();
  
  const now = new Date();
  this.facebookSessions = this.facebookSessions.filter(session => 
    session.expiresAt > now && session.failureCount < 5
  );
  
  return this.save();
};

/**
 * Get masked Facebook IDs for display
 */
userSchema.methods.getMaskedFacebookIds = function() {
  return this.getActiveFacebookSessions().map(session => ({
    id: session._id,
    maskedFbId: this.maskFacebookId(session.fbUserId),
    isActive: session.isActive,
    lastValidated: session.lastValidated,
    createdAt: session.createdAt
  }));
};

/**
 * Mask Facebook ID for privacy
 */
userSchema.methods.maskFacebookId = function(fbUserId) {
  if (!fbUserId || fbUserId.length < 8) return '****';
  return fbUserId.substring(0, 3) + '*'.repeat(fbUserId.length - 6) + fbUserId.substring(fbUserId.length - 3);
};

/**
 * Get recent action history
 */
userSchema.methods.getRecentActions = function(limit = 20) {
  return this.actionHistory
    .sort((a, b) => b.executedAt - a.executedAt)
    .slice(0, limit)
    .map(action => ({
      ...action.toObject(),
      executedBy: action.executedBy ? {
        ...action.executedBy,
        fbUserId: this.maskFacebookId(action.executedBy.fbUserId)
      } : null
    }));
};

/**
 * Update last login
 */
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

/**
 * Static method to find user by email or username
 */
userSchema.statics.findByEmailOrUsername = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier }
    ]
  });
};

/**
 * Static method to clean all expired sessions
 */
userSchema.statics.cleanAllExpiredSessions = async function() {
  const users = await this.find({
    'preferences.autoCleanExpiredSessions': true
  });
  
  for (const user of users) {
    await user.cleanExpiredSessions();
  }
  
  console.log(`🧹 Cleaned expired sessions for ${users.length} users`);
};

const User = mongoose.model('User', userSchema);

module.exports = User;