/**
 * Facebook Auto Tool - Main Server
 * Professional Facebook automation platform
 * Author: Professional Developer
 */

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import database connection
const dbConnection = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const actionRoutes = require('./routes/action');
const dashboardRoutes = require('./routes/dashboard');

/**
 * Express Application Setup
 */
const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Security Middleware
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

/**
 * CORS Configuration
 */
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

/**
 * Rate Limiting
 */
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(generalLimiter);

/**
 * Body Parsing Middleware
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

/**
 * Session Configuration
 */
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600, // lazy session update
    ttl: parseInt(process.env.SESSION_MAX_AGE) || 86400000
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000, // 24 hours
    sameSite: 'lax'
  },
  name: 'facebook-auto-tool.sid'
}));

/**
 * View Engine Setup
 */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/**
 * Static Files
 */
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

/**
 * Request Logging Middleware
 */
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`[${timestamp}] ${method} ${url} - ${ip}`);
  
  // Log session info for authenticated routes
  if (req.session && req.session.userId && !url.startsWith('/static')) {
    console.log(`  └─ User: ${req.session.username} (ID: ${req.session.userId})`);
  }
  
  next();
});

/**
 * Routes
 */

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Dashboard Route
app.use('/dashboard', dashboardRoutes);

// Root route - serve landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login page route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

/**
 * Error Handling Middleware
 */

// 404 Handler
app.use((req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.path}`);
  error.status = 404;
  next(error);
});

// Global Error Handler
app.use((error, req, res, next) => {
  const status = error.status || 500;
  const message = error.message || 'Internal Server Error';
  
  // Log error
  console.error(`[ERROR] ${status} - ${message}`);
  if (status === 500) {
    console.error(error.stack);
  }
  
  // Send error response
  if (req.accepts('json')) {
    res.status(status).json({
      success: false,
      message: process.env.NODE_ENV === 'production' && status === 500 
        ? 'Internal Server Error' 
        : message,
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
    });
  } else {
    res.status(status).render('error', {
      title: 'Error',
      status,
      message: process.env.NODE_ENV === 'production' && status === 500 
        ? 'Internal Server Error' 
        : message
    });
  }
});

/**
 * Graceful Shutdown Handler
 */
process.on('SIGTERM', async () => {
  console.log('⚠️ SIGTERM received. Gracefully shutting down...');
  
  try {
    // Close database connection
    await dbConnection.disconnect();
    
    // Close Facebook service
    const facebookService = require('./services/fbService');
    await facebookService.cleanup();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('⚠️ SIGINT received. Gracefully shutting down...');
  
  try {
    // Close database connection
    await dbConnection.disconnect();
    
    // Close Facebook service
    const facebookService = require('./services/fbService');
    await facebookService.cleanup();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

/**
 * Unhandled Promise Rejection Handler
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Close server gracefully
  process.exit(1);
});

/**
 * Uncaught Exception Handler
 */
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Close server gracefully
  process.exit(1);
});

/**
 * Application Startup
 */
async function startServer() {
  try {
    // Connect to database
    console.log('🔌 Connecting to MongoDB...');
    await dbConnection.connect();
    
    // Initialize Facebook service
    console.log('🤖 Initializing Facebook service...');
    const facebookService = require('./services/fbService');
    await facebookService.initialize();
    
    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║               🚀 FACEBOOK AUTO TOOL SERVER                  ║
║                                                              ║
║  Status: ✅ RUNNING                                          ║
║  Port: ${PORT.toString().padEnd(52)} ║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(45)} ║
║  Database: ✅ Connected                                      ║
║  Facebook Service: ✅ Ready                                  ║
║                                                              ║
║  📱 Frontend: http://localhost:${PORT.toString().padEnd(40)} ║
║  📊 Dashboard: http://localhost:${PORT}/dashboard${' '.repeat(23)} ║
║  🏥 Health: http://localhost:${PORT}/health${' '.repeat(26)} ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);
      
      // Set up periodic cleanup tasks
      setInterval(async () => {
        try {
          const User = require('./models/User');
          await User.cleanAllExpiredSessions();
        } catch (error) {
          console.error('❌ Cleanup task failed:', error);
        }
      }, 60 * 60 * 1000); // Run every hour
    });
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  startServer();
}

module.exports = app;