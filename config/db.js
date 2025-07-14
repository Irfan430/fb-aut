const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Database connection configuration
 * Handles MongoDB connection with proper error handling and reconnection logic
 */
class DatabaseConnection {
  constructor() {
    this.isConnected = false;
    this.connectionRetries = 0;
    this.maxRetries = 5;
  }

  /**
   * Connect to MongoDB with retry logic
   */
  async connect() {
    try {
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4
      };

      await mongoose.connect(process.env.MONGODB_URI, options);
      this.isConnected = true;
      this.connectionRetries = 0;
      
      console.log('✅ MongoDB connected successfully');
      
      // Handle connection events
      mongoose.connection.on('error', this.handleError.bind(this));
      mongoose.connection.on('disconnected', this.handleDisconnect.bind(this));
      mongoose.connection.on('reconnected', this.handleReconnect.bind(this));
      
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  /**
   * Handle connection errors with retry logic
   */
  async handleConnectionError(error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    if (this.connectionRetries < this.maxRetries) {
      this.connectionRetries++;
      console.log(`🔄 Retrying connection... (${this.connectionRetries}/${this.maxRetries})`);
      
      setTimeout(() => {
        this.connect();
      }, 5000 * this.connectionRetries); // Exponential backoff
    } else {
      console.error('💥 Max connection retries reached. Exiting...');
      process.exit(1);
    }
  }

  /**
   * Handle runtime errors
   */
  handleError(error) {
    console.error('❌ MongoDB runtime error:', error);
  }

  /**
   * Handle disconnection
   */
  handleDisconnect() {
    console.log('⚠️ MongoDB disconnected');
    this.isConnected = false;
  }

  /**
   * Handle reconnection
   */
  handleReconnect() {
    console.log('✅ MongoDB reconnected');
    this.isConnected = true;
  }

  /**
   * Graceful shutdown
   */
  async disconnect() {
    try {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed gracefully');
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error);
    }
  }

  /**
   * Check connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    };
  }
}

// Create singleton instance
const dbConnection = new DatabaseConnection();

// Handle process termination
process.on('SIGINT', async () => {
  console.log('⚠️ Received SIGINT. Gracefully shutting down...');
  await dbConnection.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('⚠️ Received SIGTERM. Gracefully shutting down...');
  await dbConnection.disconnect();
  process.exit(0);
});

module.exports = dbConnection;