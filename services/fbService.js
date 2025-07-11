const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

/**
 * Facebook Automation Service
 * Handles all Facebook interactions using Puppeteer
 */
class FacebookService {
  constructor() {
    this.browser = null;
    this.isInitialized = false;
    this.activeSessions = new Map();
    this.maxConcurrentSessions = 5;
    
    // Facebook selectors (these may need updates based on FB changes)
    this.selectors = {
      login: {
        email: '#email',
        password: '#pass',
        loginButton: '#loginbutton',
        twoFactorCode: '#approvals_code'
      },
      reactions: {
        like: '[data-testid="fb-ufi_likelink"]',
        love: '[data-testid="reaction_love"]',
        haha: '[data-testid="reaction_haha"]',
        wow: '[data-testid="reaction_wow"]',
        sad: '[data-testid="reaction_sad"]',
        angry: '[data-testid="reaction_angry"]',
        reactionMenu: '[data-testid="ufi_react_link"]'
      },
      follow: '[data-testid="subscribe"]',
      comment: {
        box: '[data-testid="ufi_comment_composer"]',
        submit: '[data-testid="ufi_comment_submit"]'
      }
    };
  }

  /**
   * Initialize the browser instance
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      const browserOptions = {
        headless: process.env.PUPPETEER_HEADLESS === 'true',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
        defaultViewport: {
          width: 1366,
          height: 768
        }
      };

      this.browser = await puppeteer.launch(browserOptions);
      this.isInitialized = true;
      console.log('🚀 Facebook service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Facebook service:', error);
      throw error;
    }
  }

  /**
   * Login to Facebook using credentials
   */
  async loginWithCredentials(email, password) {
    await this.initialize();
    const page = await this.browser.newPage();
    
    try {
      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to Facebook login
      await page.goto('https://www.facebook.com/login', { 
        waitUntil: 'networkidle2',
        timeout: parseInt(process.env.PUPPETEER_TIMEOUT) || 30000
      });

      // Fill login form
      await page.waitForSelector(this.selectors.login.email);
      await page.type(this.selectors.login.email, email);
      await page.type(this.selectors.login.password, password);

      // Click login button
      await page.click(this.selectors.login.loginButton);
      await page.waitForNavigation({ waitUntil: 'networkidle2' });

      // Check for successful login
      const currentUrl = page.url();
      if (currentUrl.includes('checkpoint') || currentUrl.includes('login')) {
        throw new Error('Login failed - Invalid credentials or security check required');
      }

      // Extract user ID from page
      const fbUserId = await this.extractUserIdFromPage(page);
      
      // Get cookies
      const cookies = await page.cookies();
      const cookieString = JSON.stringify(cookies);

      await page.close();

      return {
        success: true,
        fbUserId,
        cookies: cookieString,
        userAgent: await page.evaluate(() => navigator.userAgent)
      };

    } catch (error) {
      await page.close();
      console.error('❌ Login failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate Facebook cookies
   */
  async validateCookies(cookiesString, userAgent) {
    await this.initialize();
    const page = await this.browser.newPage();
    
    try {
      await page.setUserAgent(userAgent);
      
      // Set cookies
      const cookies = JSON.parse(cookiesString);
      await page.setCookie(...cookies);

      // Navigate to Facebook to test cookies
      await page.goto('https://www.facebook.com', { 
        waitUntil: 'networkidle2',
        timeout: parseInt(process.env.PUPPETEER_TIMEOUT) || 30000
      });

      // Check if we're logged in
      const isLoggedIn = await page.evaluate(() => {
        return !window.location.href.includes('login') && 
               document.querySelector('[data-testid="royal_login_form"]') === null;
      });

      if (isLoggedIn) {
        const fbUserId = await this.extractUserIdFromPage(page);
        await page.close();
        return { isValid: true, fbUserId };
      } else {
        await page.close();
        return { isValid: false };
      }

    } catch (error) {
      await page.close();
      console.error('❌ Cookie validation failed:', error);
      return { isValid: false, error: error.message };
    }
  }

  /**
   * Extract Facebook User ID from page
   */
  async extractUserIdFromPage(page) {
    try {
      // Multiple methods to extract user ID
      const fbUserId = await page.evaluate(() => {
        // Method 1: From page source
        const userIdMatch = document.documentElement.innerHTML.match(/"USER_ID":"(\d+)"/);
        if (userIdMatch) return userIdMatch[1];

        // Method 2: From profile link
        const profileLink = document.querySelector('a[href*="/profile.php?id="]');
        if (profileLink) {
          const href = profileLink.getAttribute('href');
          const idMatch = href.match(/id=(\d+)/);
          if (idMatch) return idMatch[1];
        }

        // Method 3: From data attributes
        const userElement = document.querySelector('[data-ownerid]');
        if (userElement) return userElement.getAttribute('data-ownerid');

        return null;
      });

      return fbUserId || 'unknown';
    } catch (error) {
      console.error('❌ Failed to extract user ID:', error);
      return 'unknown';
    }
  }

  /**
   * Perform Facebook action (like, react, follow, comment)
   */
  async performAction(sessionData, actionData) {
    const actionId = uuidv4();
    
    try {
      await this.initialize();
      const page = await this.browser.newPage();
      
      // Set user agent and cookies
      await page.setUserAgent(sessionData.userAgent);
      const cookies = JSON.parse(sessionData.cookies);
      await page.setCookie(...cookies);

      // Navigate to target
      const targetUrl = this.buildTargetUrl(actionData.targetId, actionData.targetType);
      await page.goto(targetUrl, { 
        waitUntil: 'networkidle2',
        timeout: parseInt(process.env.PUPPETEER_TIMEOUT) || 30000
      });

      // Verify we're still logged in
      const isLoggedIn = await this.verifyLoginStatus(page);
      if (!isLoggedIn) {
        await page.close();
        return {
          actionId,
          success: false,
          error: 'Session expired - cookies no longer valid'
        };
      }

      // Execute the specific action
      let result;
      switch (actionData.actionType) {
        case 'like':
          result = await this.performLikeAction(page);
          break;
        case 'love':
        case 'haha':
        case 'wow':
        case 'sad':
        case 'angry':
          result = await this.performReactionAction(page, actionData.actionType);
          break;
        case 'follow':
          result = await this.performFollowAction(page);
          break;
        case 'comment':
          result = await this.performCommentAction(page, actionData.comment);
          break;
        default:
          throw new Error(`Unsupported action type: ${actionData.actionType}`);
      }

      await page.close();

      return {
        actionId,
        success: result.success,
        message: result.message,
        error: result.error
      };

    } catch (error) {
      console.error(`❌ Action ${actionData.actionType} failed:`, error);
      return {
        actionId,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build target URL based on type and ID
   */
  buildTargetUrl(targetId, targetType) {
    switch (targetType) {
      case 'post':
        return `https://www.facebook.com/${targetId}`;
      case 'user':
        return `https://www.facebook.com/${targetId}`;
      case 'page':
        return `https://www.facebook.com/${targetId}`;
      default:
        return `https://www.facebook.com/${targetId}`;
    }
  }

  /**
   * Verify login status on page
   */
  async verifyLoginStatus(page) {
    try {
      return await page.evaluate(() => {
        return !window.location.href.includes('login') && 
               document.querySelector('[data-testid="royal_login_form"]') === null;
      });
    } catch {
      return false;
    }
  }

  /**
   * Perform like action
   */
  async performLikeAction(page) {
    try {
      await page.waitForSelector(this.selectors.reactions.like, { timeout: 10000 });
      await page.click(this.selectors.reactions.like);
      
      // Wait a bit for the action to complete
      await page.waitForTimeout(2000);
      
      return { success: true, message: 'Post liked successfully' };
    } catch (error) {
      return { success: false, error: 'Failed to like post: ' + error.message };
    }
  }

  /**
   * Perform reaction action (love, haha, wow, sad, angry)
   */
  async performReactionAction(page, reactionType) {
    try {
      // First click on reaction menu to open options
      await page.waitForSelector(this.selectors.reactions.reactionMenu, { timeout: 10000 });
      await page.hover(this.selectors.reactions.reactionMenu);
      
      // Wait for reaction options to appear
      await page.waitForTimeout(1000);
      
      // Click specific reaction
      const reactionSelector = this.selectors.reactions[reactionType];
      await page.waitForSelector(reactionSelector, { timeout: 5000 });
      await page.click(reactionSelector);
      
      await page.waitForTimeout(2000);
      
      return { success: true, message: `${reactionType} reaction added successfully` };
    } catch (error) {
      return { success: false, error: `Failed to add ${reactionType} reaction: ${error.message}` };
    }
  }

  /**
   * Perform follow action
   */
  async performFollowAction(page) {
    try {
      await page.waitForSelector(this.selectors.follow, { timeout: 10000 });
      await page.click(this.selectors.follow);
      
      await page.waitForTimeout(2000);
      
      return { success: true, message: 'Successfully followed user/page' };
    } catch (error) {
      return { success: false, error: 'Failed to follow: ' + error.message };
    }
  }

  /**
   * Perform comment action
   */
  async performCommentAction(page, commentText) {
    try {
      if (!commentText || commentText.trim().length === 0) {
        return { success: false, error: 'Comment text is required' };
      }

      await page.waitForSelector(this.selectors.comment.box, { timeout: 10000 });
      await page.click(this.selectors.comment.box);
      
      // Type comment
      await page.type(this.selectors.comment.box, commentText);
      
      // Submit comment
      await page.click(this.selectors.comment.submit);
      
      await page.waitForTimeout(3000);
      
      return { success: true, message: 'Comment posted successfully' };
    } catch (error) {
      return { success: false, error: 'Failed to post comment: ' + error.message };
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    return {
      isInitialized: this.isInitialized,
      activeSessions: this.activeSessions.size,
      maxConcurrentSessions: this.maxConcurrentSessions,
      browserConnected: this.browser && this.browser.isConnected()
    };
  }

  /**
   * Close browser and cleanup
   */
  async cleanup() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.isInitialized = false;
      this.activeSessions.clear();
      console.log('🧹 Facebook service cleaned up');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  /**
   * Health check for the service
   */
  async healthCheck() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      const page = await this.browser.newPage();
      await page.goto('https://www.facebook.com', { timeout: 10000 });
      await page.close();
      
      return { healthy: true, message: 'Service is operational' };
    } catch (error) {
      return { healthy: false, message: error.message };
    }
  }
}

// Create singleton instance
const facebookService = new FacebookService();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('⚠️ Shutting down Facebook service...');
  await facebookService.cleanup();
});

process.on('SIGTERM', async () => {
  console.log('⚠️ Shutting down Facebook service...');
  await facebookService.cleanup();
});

module.exports = facebookService;