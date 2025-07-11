/**
 * Facebook Auto Tool - Frontend JavaScript
 * Handles authentication, session management, and UI interactions
 */

class FacebookAutoTool {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.activeSessions = [];
        this.supportedActions = [];
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        this.setupEventListeners();
        await this.checkAuthStatus();
        await this.loadSupportedActions();
        this.showAppropriateForm();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Form toggles
        this.bindEvent('#showRegisterForm', 'click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });

        this.bindEvent('#showLoginForm', 'click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        // Password toggles
        this.setupPasswordToggle('#toggleLoginPassword', '#loginPassword');
        this.setupPasswordToggle('#toggleRegisterPassword', '#registerPassword');
        this.setupPasswordToggle('#toggleFbPassword', '#fbPassword');

        // Form submissions
        this.bindEvent('#loginFormElement', 'submit', this.handleLogin.bind(this));
        this.bindEvent('#registerFormElement', 'submit', this.handleRegister.bind(this));
        this.bindEvent('#fbCredentialsForm', 'submit', this.handleFacebookCredentials.bind(this));
        this.bindEvent('#fbCookiesForm', 'submit', this.handleFacebookCookies.bind(this));

        // Facebook session method toggles
        this.bindEvent('#useCredentialsBtn', 'click', () => this.showCredentialsMethod());
        this.bindEvent('#useCookiesBtn', 'click', () => this.showCookiesMethod());

        // Dashboard navigation
        this.bindEvent('#goToDashboardBtn', 'click', () => {
            window.location.href = '/dashboard';
        });

        // Password confirmation validation
        this.bindEvent('#confirmPassword', 'input', this.validatePasswordConfirmation.bind(this));
        this.bindEvent('#registerPassword', 'input', this.validatePasswordConfirmation.bind(this));
    }

    /**
     * Bind event listener with null check
     */
    bindEvent(selector, event, handler) {
        const element = document.querySelector(selector);
        if (element) {
            element.addEventListener(event, handler);
        }
    }

    /**
     * Setup password toggle functionality
     */
    setupPasswordToggle(toggleSelector, inputSelector) {
        this.bindEvent(toggleSelector, 'click', (e) => {
            e.preventDefault();
            const input = document.querySelector(inputSelector);
            const toggle = document.querySelector(toggleSelector);
            
            if (input && toggle) {
                const icon = toggle.querySelector('i');
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            }
        });
    }

    /**
     * Check authentication status
     */
    async checkAuthStatus() {
        try {
            const response = await this.makeRequest('/api/auth/check');
            if (response.success && response.authenticated) {
                this.isAuthenticated = true;
                this.currentUser = response.user;
                await this.loadUserSessions();
            }
        } catch (error) {
            console.log('User not authenticated');
        }
    }

    /**
     * Load supported actions
     */
    async loadSupportedActions() {
        try {
            const response = await this.makeRequest('/api/actions/supported');
            if (response.success) {
                this.supportedActions = response.data.actions;
            }
        } catch (error) {
            console.error('Failed to load supported actions:', error);
        }
    }

    /**
     * Load user Facebook sessions
     */
    async loadUserSessions() {
        try {
            const response = await this.makeRequest('/api/auth/facebook/sessions');
            if (response.success) {
                this.activeSessions = response.data.sessions;
            }
        } catch (error) {
            console.error('Failed to load sessions:', error);
        }
    }

    /**
     * Show appropriate form based on auth status
     */
    showAppropriateForm() {
        if (this.isAuthenticated) {
            this.showFacebookSessionForm();
        } else {
            this.showLoginForm();
        }
    }

    /**
     * Show login form
     */
    showLoginForm() {
        this.hideAllForms();
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.classList.remove('d-none');
        }
    }

    /**
     * Show register form
     */
    showRegisterForm() {
        this.hideAllForms();
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.classList.remove('d-none');
        }
    }

    /**
     * Show Facebook session form
     */
    showFacebookSessionForm() {
        this.hideAllForms();
        const fbForm = document.getElementById('facebookSessionForm');
        if (fbForm) {
            fbForm.classList.remove('d-none');
        }
    }

    /**
     * Hide all forms
     */
    hideAllForms() {
        const forms = ['loginForm', 'registerForm', 'facebookSessionForm'];
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) {
                form.classList.add('d-none');
            }
        });
    }

    /**
     * Show credentials method
     */
    showCredentialsMethod() {
        const credentialsMethod = document.getElementById('credentialsMethod');
        const cookiesMethod = document.getElementById('cookiesMethod');
        const useCredentialsBtn = document.getElementById('useCredentialsBtn');
        const useCookiesBtn = document.getElementById('useCookiesBtn');

        if (credentialsMethod) credentialsMethod.classList.remove('d-none');
        if (cookiesMethod) cookiesMethod.classList.add('d-none');
        
        if (useCredentialsBtn) {
            useCredentialsBtn.classList.remove('btn-outline-primary');
            useCredentialsBtn.classList.add('btn-primary');
        }
        
        if (useCookiesBtn) {
            useCookiesBtn.classList.remove('btn-secondary');
            useCookiesBtn.classList.add('btn-outline-secondary');
        }
    }

    /**
     * Show cookies method
     */
    showCookiesMethod() {
        const credentialsMethod = document.getElementById('credentialsMethod');
        const cookiesMethod = document.getElementById('cookiesMethod');
        const useCredentialsBtn = document.getElementById('useCredentialsBtn');
        const useCookiesBtn = document.getElementById('useCookiesBtn');

        if (credentialsMethod) credentialsMethod.classList.add('d-none');
        if (cookiesMethod) cookiesMethod.classList.remove('d-none');
        
        if (useCredentialsBtn) {
            useCredentialsBtn.classList.remove('btn-primary');
            useCredentialsBtn.classList.add('btn-outline-primary');
        }
        
        if (useCookiesBtn) {
            useCookiesBtn.classList.remove('btn-outline-secondary');
            useCookiesBtn.classList.add('btn-secondary');
        }
    }

    /**
     * Handle login form submission
     */
    async handleLogin(e) {
        e.preventDefault();
        
        const identifier = document.getElementById('loginIdentifier').value;
        const password = document.getElementById('loginPassword').value;

        if (!identifier || !password) {
            this.showAlert('Please fill in all fields', 'danger');
            return;
        }

        this.showLoading(true);

        try {
            const response = await this.makeRequest('/api/auth/login', 'POST', {
                identifier,
                password
            });

            if (response.success) {
                this.showAlert('Login successful! Redirecting...', 'success');
                this.isAuthenticated = true;
                this.currentUser = response.data;
                
                setTimeout(() => {
                    this.showFacebookSessionForm();
                }, 1000);
            } else {
                this.showAlert(response.message || 'Login failed', 'danger');
            }
        } catch (error) {
            this.showAlert('Login failed. Please try again.', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Handle register form submission
     */
    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;

        // Validation
        if (!username || !email || !password || !confirmPassword) {
            this.showAlert('Please fill in all fields', 'danger');
            return;
        }

        if (password !== confirmPassword) {
            this.showAlert('Passwords do not match', 'danger');
            return;
        }

        if (password.length < 6) {
            this.showAlert('Password must be at least 6 characters long', 'danger');
            return;
        }

        if (!this.validatePassword(password)) {
            this.showAlert('Password must contain at least one uppercase letter, one lowercase letter, and one number', 'danger');
            return;
        }

        if (!agreeTerms) {
            this.showAlert('Please agree to the terms and conditions', 'danger');
            return;
        }

        this.showLoading(true);

        try {
            const response = await this.makeRequest('/api/auth/register', 'POST', {
                username,
                email,
                password
            });

            if (response.success) {
                this.showAlert('Registration successful! Please login.', 'success');
                
                setTimeout(() => {
                    this.showLoginForm();
                    // Pre-fill login form
                    document.getElementById('loginIdentifier').value = email;
                }, 1500);
            } else {
                this.showAlert(response.message || 'Registration failed', 'danger');
            }
        } catch (error) {
            this.showAlert('Registration failed. Please try again.', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Handle Facebook credentials form submission
     */
    async handleFacebookCredentials(e) {
        e.preventDefault();
        
        const fbEmail = document.getElementById('fbEmail').value;
        const fbPassword = document.getElementById('fbPassword').value;

        if (!fbEmail || !fbPassword) {
            this.showAlert('Please fill in all Facebook credentials', 'danger');
            return;
        }

        this.showLoading(true);

        try {
            const response = await this.makeRequest('/api/auth/facebook/login', 'POST', {
                fbEmail,
                fbPassword
            });

            if (response.success) {
                this.showAlert('Facebook account added successfully!', 'success');
                await this.loadUserSessions();
                this.clearForm('#fbCredentialsForm');
            } else {
                this.showAlert(response.message || 'Failed to add Facebook account', 'danger');
            }
        } catch (error) {
            this.showAlert('Failed to add Facebook account. Please check your credentials.', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Handle Facebook cookies form submission
     */
    async handleFacebookCookies(e) {
        e.preventDefault();
        
        const cookies = document.getElementById('fbCookies').value;
        const userAgent = document.getElementById('userAgent').value;

        if (!cookies) {
            this.showAlert('Please provide Facebook cookies', 'danger');
            return;
        }

        // Validate JSON format
        try {
            const parsedCookies = JSON.parse(cookies);
            if (!Array.isArray(parsedCookies)) {
                throw new Error('Cookies must be an array');
            }
        } catch (error) {
            this.showAlert('Invalid cookies format. Please provide valid JSON array.', 'danger');
            return;
        }

        this.showLoading(true);

        try {
            const response = await this.makeRequest('/api/auth/facebook/cookies', 'POST', {
                cookies,
                userAgent
            });

            if (response.success) {
                this.showAlert('Facebook session added successfully!', 'success');
                await this.loadUserSessions();
                this.clearForm('#fbCookiesForm');
            } else {
                this.showAlert(response.message || 'Failed to add Facebook session', 'danger');
            }
        } catch (error) {
            this.showAlert('Failed to add Facebook session. Please check your cookies.', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Validate password strength
     */
    validatePassword(password) {
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        
        return hasUpperCase && hasLowerCase && hasNumbers;
    }

    /**
     * Validate password confirmation
     */
    validatePasswordConfirmation() {
        const password = document.getElementById('registerPassword');
        const confirmPassword = document.getElementById('confirmPassword');
        
        if (password && confirmPassword) {
            if (confirmPassword.value && password.value !== confirmPassword.value) {
                confirmPassword.setCustomValidity('Passwords do not match');
                confirmPassword.classList.add('is-invalid');
            } else {
                confirmPassword.setCustomValidity('');
                confirmPassword.classList.remove('is-invalid');
            }
        }
    }

    /**
     * Make HTTP request
     */
    async makeRequest(url, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin'
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    /**
     * Show alert message
     */
    showAlert(message, type = 'info', duration = 5000) {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;

        const alertId = 'alert-' + Date.now();
        const alertHTML = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                <i class="fas fa-${this.getAlertIcon(type)} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        alertContainer.insertAdjacentHTML('beforeend', alertHTML);

        // Auto dismiss after duration
        if (duration > 0) {
            setTimeout(() => {
                const alert = document.getElementById(alertId);
                if (alert) {
                    const bsAlert = new bootstrap.Alert(alert);
                    bsAlert.close();
                }
            }, duration);
        }
    }

    /**
     * Get alert icon based on type
     */
    getAlertIcon(type) {
        const icons = {
            'success': 'check-circle',
            'danger': 'exclamation-triangle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    /**
     * Show/hide loading overlay
     */
    showLoading(show) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            if (show) {
                loadingOverlay.classList.remove('d-none');
            } else {
                loadingOverlay.classList.add('d-none');
            }
        }
    }

    /**
     * Clear form fields
     */
    clearForm(formSelector) {
        const form = document.querySelector(formSelector);
        if (form) {
            form.reset();
            // Clear any validation states
            const inputs = form.querySelectorAll('.form-control');
            inputs.forEach(input => {
                input.classList.remove('is-valid', 'is-invalid');
            });
        }
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        if (!dateString) return 'Never';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        
        return date.toLocaleDateString();
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showAlert('Copied to clipboard!', 'success', 2000);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showAlert('Copied to clipboard!', 'success', 2000);
        }
    }
}

/**
 * Dashboard functionality
 */
class FacebookDashboard extends FacebookAutoTool {
    constructor() {
        super();
        this.actionHistory = [];
        this.dashboardData = null;
        this.selectedAction = null;
        this.refreshInterval = null;
    }

    /**
     * Initialize dashboard
     */
    async init() {
        await super.init();
        this.setupDashboardEventListeners();
        await this.loadDashboardData();
        this.setupAutoRefresh();
        this.renderActionButtons();
    }

    /**
     * Setup dashboard-specific event listeners
     */
    setupDashboardEventListeners() {
        // Action form submission
        this.bindEvent('#actionForm', 'submit', this.handleActionExecution.bind(this));
        
        // Action type selection
        this.bindEvent('#actionGrid', 'click', this.handleActionSelection.bind(this));
        
        // Refresh buttons
        this.bindEvent('#refreshDashboard', 'click', this.loadDashboardData.bind(this));
        this.bindEvent('#refreshSessions', 'click', this.loadUserSessions.bind(this));
        
        // Target validation
        this.bindEvent('#targetId', 'blur', this.validateTarget.bind(this));
        
        // Session removal
        this.bindEvent('.sessions-list', 'click', this.handleSessionAction.bind(this));
    }

    /**
     * Load dashboard data
     */
    async loadDashboardData() {
        try {
            const response = await this.makeRequest('/api/dashboard/data');
            if (response.success) {
                this.dashboardData = response.data;
                this.renderDashboardStats();
                this.renderSessions();
                this.renderActivityFeed();
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showAlert('Failed to load dashboard data', 'danger');
        }
    }

    /**
     * Render action buttons grid
     */
    renderActionButtons() {
        const actionGrid = document.getElementById('actionGrid');
        if (!actionGrid || !this.supportedActions.length) return;

        const buttonsHTML = this.supportedActions.map(action => `
            <div class="action-button" data-action="${action.type}">
                <i class="${action.icon || 'fas fa-star'}"></i>
                <div class="action-name">${action.name}</div>
                <small class="text-muted">${action.description}</small>
            </div>
        `).join('');

        actionGrid.innerHTML = buttonsHTML;
    }

    /**
     * Handle action selection
     */
    handleActionSelection(e) {
        const actionButton = e.target.closest('.action-button');
        if (!actionButton) return;

        // Remove previous selection
        document.querySelectorAll('.action-button').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Select current action
        actionButton.classList.add('selected');
        this.selectedAction = actionButton.dataset.action;

        // Show/hide comment field
        const commentField = document.getElementById('commentField');
        if (commentField) {
            if (this.selectedAction === 'comment') {
                commentField.classList.remove('d-none');
                document.getElementById('comment').required = true;
            } else {
                commentField.classList.add('d-none');
                document.getElementById('comment').required = false;
            }
        }
    }

    /**
     * Handle action execution
     */
    async handleActionExecution(e) {
        e.preventDefault();

        const targetId = document.getElementById('targetId').value;
        const comment = document.getElementById('comment').value;

        if (!targetId) {
            this.showAlert('Please enter a target URL or ID', 'danger');
            return;
        }

        if (!this.selectedAction) {
            this.showAlert('Please select an action type', 'danger');
            return;
        }

        if (this.selectedAction === 'comment' && !comment.trim()) {
            this.showAlert('Please enter a comment', 'danger');
            return;
        }

        this.showLoading(true);

        try {
            const response = await this.makeRequest('/api/actions/execute', 'POST', {
                targetId: targetId.trim(),
                actionType: this.selectedAction,
                comment: comment.trim() || undefined
            });

            if (response.success) {
                this.showAlert('Action executed successfully!', 'success');
                this.clearForm('#actionForm');
                this.selectedAction = null;
                document.querySelectorAll('.action-button').forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                // Refresh data
                await this.loadDashboardData();
            } else {
                this.showAlert(response.message || 'Action failed', 'danger');
            }
        } catch (error) {
            this.showAlert('Action execution failed. Please try again.', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Validate target URL/ID
     */
    async validateTarget(e) {
        const targetId = e.target.value.trim();
        if (!targetId) return;

        try {
            const response = await this.makeRequest('/api/actions/validate-target', 'POST', {
                targetId
            });

            const feedback = document.getElementById('targetFeedback');
            if (feedback) {
                if (response.success && response.data.isValid) {
                    feedback.innerHTML = `<i class="fas fa-check text-success me-1"></i>Valid ${response.data.targetType}`;
                    feedback.className = 'form-text text-success';
                } else {
                    feedback.innerHTML = `<i class="fas fa-exclamation-triangle text-warning me-1"></i>Could not validate target`;
                    feedback.className = 'form-text text-warning';
                }
            }
        } catch (error) {
            // Silently handle validation errors
            console.warn('Target validation failed:', error);
        }
    }

    /**
     * Render dashboard statistics
     */
    renderDashboardStats() {
        if (!this.dashboardData) return;

        const stats = this.dashboardData.stats;
        
        this.updateStatCard('activeSessions', stats.activeSessions, 'Sessions');
        this.updateStatCard('todayActions', stats.todayActions, 'Today');
        this.updateStatCard('successRate', `${stats.successRate}%`, 'Success');
        this.updateStatCard('totalActions', stats.totalActions, 'Total');
    }

    /**
     * Update stat card
     */
    updateStatCard(id, value, label) {
        const card = document.getElementById(id);
        if (card) {
            const valueElement = card.querySelector('.stat-value');
            const labelElement = card.querySelector('.stat-label');
            
            if (valueElement) valueElement.textContent = value;
            if (labelElement) labelElement.textContent = label;
        }
    }

    /**
     * Render sessions list
     */
    renderSessions() {
        const sessionsList = document.querySelector('.sessions-list');
        if (!sessionsList || !this.dashboardData) return;

        const sessions = this.dashboardData.sessions.active;
        
        if (sessions.length === 0) {
            sessionsList.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fab fa-facebook fa-3x mb-3 opacity-25"></i>
                    <p>No Facebook accounts connected</p>
                    <a href="/login.html" class="btn btn-primary">Add Facebook Account</a>
                </div>
            `;
            return;
        }

        const sessionsHTML = sessions.map(session => `
            <div class="session-item">
                <div class="d-flex align-items-center">
                    <div class="session-status ${session.isActive ? 'active' : 'inactive'}"></div>
                    <div>
                        <div class="fw-bold">${session.maskedFbId}</div>
                        <small class="text-muted">Added ${this.formatDate(session.createdAt)}</small>
                    </div>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-danger" data-action="remove" data-session="${session.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        sessionsList.innerHTML = sessionsHTML;
    }

    /**
     * Render activity feed
     */
    renderActivityFeed() {
        const activityFeed = document.querySelector('.activity-feed');
        if (!activityFeed || !this.dashboardData) return;

        const actions = this.dashboardData.actions.recent;
        
        if (actions.length === 0) {
            activityFeed.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-history fa-2x mb-3 opacity-25"></i>
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }

        const activityHTML = actions.map(action => `
            <div class="activity-item">
                <div class="activity-icon ${action.status}">
                    <i class="fas fa-${action.status === 'success' ? 'check' : 'times'}"></i>
                </div>
                <div class="flex-grow-1">
                    <div class="fw-bold">${action.actionType} action</div>
                    <small class="text-muted">
                        ${action.targetType} ${action.targetId} • ${this.formatDate(action.executedAt)}
                    </small>
                </div>
                <span class="badge bg-${action.status === 'success' ? 'success' : 'danger'}">
                    ${action.status}
                </span>
            </div>
        `).join('');

        activityFeed.innerHTML = activityHTML;
    }

    /**
     * Handle session actions (remove, etc.)
     */
    async handleSessionAction(e) {
        const button = e.target.closest('[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const sessionId = button.dataset.session;

        if (action === 'remove') {
            if (!confirm('Are you sure you want to remove this Facebook session?')) {
                return;
            }

            try {
                const response = await this.makeRequest(`/api/auth/facebook/sessions/${sessionId}`, 'DELETE');
                
                if (response.success) {
                    this.showAlert('Session removed successfully', 'success');
                    await this.loadDashboardData();
                } else {
                    this.showAlert('Failed to remove session', 'danger');
                }
            } catch (error) {
                this.showAlert('Failed to remove session', 'danger');
            }
        }
    }

    /**
     * Setup auto refresh
     */
    setupAutoRefresh() {
        // Refresh dashboard data every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadDashboardData();
        }, 30000);
    }

    /**
     * Cleanup on page unload
     */
    cleanup() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

// Initialize the appropriate class based on page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('/dashboard')) {
        window.facebookApp = new FacebookDashboard();
    } else {
        window.facebookApp = new FacebookAutoTool();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.facebookApp && window.facebookApp.cleanup) {
        window.facebookApp.cleanup();
    }
});