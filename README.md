# 🚀 Facebook Auto Tool

A professional, production-ready Facebook automation platform built with Node.js, Express, and MongoDB. This tool enables secure management of multiple Facebook accounts with automated actions like reactions, comments, and follows.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?logo=mongodb&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?logo=express&logoColor=%2361DAFB)

## ✨ Features

### 🔐 Security & Privacy
- **Enterprise-grade encryption** for cookie storage
- **Secure session management** with MongoDB store
- **Input validation** and XSS protection
- **Rate limiting** to prevent abuse
- **Masked Facebook IDs** for privacy

### 🤖 Facebook Automation
- **Multiple login methods**: Credentials or cookies
- **Smart reactions**: Like, Love, Haha, Wow, Sad, Angry
- **Auto comments** with custom text
- **Follow management** for users and pages
- **Session rotation** across multiple accounts

### 📊 Analytics & Monitoring
- **Real-time dashboard** with action statistics
- **Success rate tracking** and failure analysis
- **Action history** with detailed logs
- **System health monitoring**
- **Auto cleanup** of expired sessions

### 🏗️ Architecture
- **Modular MVC architecture** with clean separation
- **RESTful API** design with comprehensive validation
- **Professional error handling** and logging
- **Graceful shutdown** and process management
- **Production-ready** for Render.com deployment

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **MongoDB** (local or MongoDB Atlas)
- **Modern web browser** with JavaScript enabled

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd facebook-auto-tool
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Application Configuration
NODE_ENV=production
PORT=3000

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/facebook-auto-tool
# For production/Render: mongodb+srv://username:password@cluster.mongodb.net/facebook-auto-tool

# Session Configuration
SESSION_SECRET=your-ultra-secure-session-secret-change-this-in-production
SESSION_MAX_AGE=86400000

# Facebook Configuration (optional for Graph API)
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Puppeteer Configuration
PUPPETEER_HEADLESS=true
PUPPETEER_TIMEOUT=30000

# Logging
LOG_LEVEL=info
```

### 4. Start the Application

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Dashboard**: http://localhost:3000/dashboard
- **Health Check**: http://localhost:3000/health

## 🚀 Deployment on Render.com

### 1. Prepare for Deployment

1. **Set up MongoDB Atlas** (recommended for production)
2. **Update environment variables** for production
3. **Ensure all secrets are secure** and unique

### 2. Deploy to Render

1. **Connect your repository** to Render
2. **Create a new Web Service**
3. **Configure build and start commands**:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. **Set environment variables** in Render dashboard
5. **Deploy** and test the application

### 3. Environment Variables for Render

```env
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/facebook-auto-tool
SESSION_SECRET=your-production-session-secret
PUPPETEER_HEADLESS=true
```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123"
  }'
```

#### Login User
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "identifier": "test@example.com",
    "password": "SecurePass123"
  }'
```

#### Add Facebook Account (Credentials)
```bash
curl -X POST http://localhost:3000/api/auth/facebook/login \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "fbEmail": "your-facebook-email@example.com",
    "fbPassword": "your-facebook-password"
  }'
```

#### Add Facebook Account (Cookies)
```bash
curl -X POST http://localhost:3000/api/auth/facebook/cookies \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "cookies": "[{\"name\":\"c_user\",\"value\":\"123456789\"},{\"name\":\"xs\",\"value\":\"token_value\"}]",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  }'
```

### Action Endpoints

#### Execute Facebook Action
```bash
curl -X POST http://localhost:3000/api/actions/execute \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "targetId": "https://facebook.com/post/123456789",
    "actionType": "like"
  }'
```

#### Execute Comment Action
```bash
curl -X POST http://localhost:3000/api/actions/execute \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "targetId": "https://facebook.com/post/123456789",
    "actionType": "comment",
    "comment": "Great post! 👍"
  }'
```

#### Get Action History
```bash
curl -X GET http://localhost:3000/api/actions/history?limit=10 \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

#### Get Action Statistics
```bash
curl -X GET http://localhost:3000/api/actions/stats \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Dashboard Endpoints

#### Get Dashboard Data
```bash
curl -X GET http://localhost:3000/api/dashboard/data \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

#### Health Check
```bash
curl -X GET http://localhost:3000/api/dashboard/health
```

## 🏗️ Project Structure

```
facebook-auto-tool/
├── package.json              # Dependencies and scripts
├── index.js                  # Main server file
├── README.md                 # Project documentation
├── .env                      # Environment variables
├── .gitignore               # Git ignore rules
├── config/
│   └── db.js                # Database configuration
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── action.js            # Action execution routes
│   └── dashboard.js         # Dashboard routes
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── actionController.js  # Action execution logic
│   └── dashboardController.js # Dashboard logic
├── models/
│   └── User.js              # User and session models
├── services/
│   └── fbService.js         # Facebook automation service
├── public/
│   ├── index.html           # Landing page
│   ├── login.html           # Login/registration page
│   ├── styles.css           # Custom styles
│   └── script.js            # Frontend JavaScript
└── views/
    └── dashboard.ejs        # Dashboard template
```

## 🔧 Configuration Options

### Puppeteer Settings
- **PUPPETEER_HEADLESS**: Run browser in headless mode (recommended for production)
- **PUPPETEER_TIMEOUT**: Maximum time to wait for page loads (default: 30 seconds)

### Security Settings
- **SESSION_SECRET**: Secret key for session encryption (must be unique and secure)
- **BCRYPT_ROUNDS**: Number of salt rounds for password hashing (default: 12)
- **RATE_LIMIT_MAX_REQUESTS**: Maximum requests per window (default: 100)

### Database Settings
- **MONGODB_URI**: MongoDB connection string
- **SESSION_MAX_AGE**: Session lifetime in milliseconds (default: 24 hours)

## 🚨 Security Considerations

### Production Deployment
1. **Use strong, unique passwords** for all accounts
2. **Enable HTTPS** in production (Render provides this automatically)
3. **Regularly rotate session secrets** and API keys
4. **Monitor logs** for suspicious activity
5. **Keep dependencies updated** for security patches

### Facebook Account Safety
1. **Use dedicated Facebook accounts** for automation
2. **Respect Facebook's rate limits** and terms of service
3. **Monitor account health** and disable problematic sessions
4. **Use realistic delays** between actions to avoid detection

## 🐛 Troubleshooting

### Common Issues

#### MongoDB Connection Error
```bash
Error: Failed to connect to MongoDB
```
**Solution**: Verify your MongoDB URI and ensure the database is running.

#### Puppeteer Installation Issues
```bash
Error: Failed to launch the browser process
```
**Solutions**:
- Install required dependencies: `sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2`
- Use Docker for consistent environments
- Check Puppeteer documentation for platform-specific requirements

#### Session Expired Errors
```bash
Error: Session expired - cookies no longer valid
```
**Solution**: The Facebook cookies have expired. Re-add the Facebook account with fresh cookies.

### Debug Mode
Enable detailed logging:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is for educational and legitimate automation purposes only. Users are responsible for compliance with Facebook's Terms of Service and applicable laws. The developers are not responsible for any misuse of this software.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

If you encounter any issues or have questions:

1. Check the [troubleshooting section](#🐛-troubleshooting)
2. Review the [API documentation](#📚-api-documentation)
3. Create an issue on GitHub with detailed information about your problem

---

**Made with ❤️ for the automation community**