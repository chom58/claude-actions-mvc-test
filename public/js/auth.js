/**
 * Authentication utility for handling JWT tokens and automatic refresh
 */
class AuthManager {
    constructor() {
        this.API_BASE_URL = 'http://localhost:3000/api';
        this.refreshInterval = null;
        this.isRefreshing = false;
        this.refreshPromise = null;
        
        // Start auto-refresh if user is authenticated
        this.init();
    }

    /**
     * Initialize the auth manager
     */
    init() {
        if (this.isAuthenticated()) {
            this.startAutoRefresh();
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return localStorage.getItem('isAuthenticated') === 'true' && 
               localStorage.getItem('user') !== null;
    }

    /**
     * Get current user data
     */
    getCurrentUser() {
        try {
            const userData = localStorage.getItem('user');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Failed to parse user data:', error);
            return null;
        }
    }

    /**
     * Set authentication state
     */
    setAuthState(user) {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user', JSON.stringify(user));
        this.startAutoRefresh();
    }

    /**
     * Clear authentication state
     */
    clearAuthState() {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('user');
        this.stopAutoRefresh();
    }

    /**
     * Start automatic token refresh
     */
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Refresh token every 10 minutes (tokens expire in 15 minutes)
        this.refreshInterval = setInterval(() => {
            this.refreshToken();
        }, 10 * 60 * 1000);
    }

    /**
     * Stop automatic token refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Refresh authentication token
     */
    async refreshToken() {
        // Prevent multiple concurrent refresh attempts
        if (this.isRefreshing) {
            return this.refreshPromise;
        }

        this.isRefreshing = true;
        
        this.refreshPromise = this._performTokenRefresh();
        
        try {
            await this.refreshPromise;
        } finally {
            this.isRefreshing = false;
            this.refreshPromise = null;
        }
    }

    /**
     * Perform the actual token refresh
     */
    async _performTokenRefresh() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/users/refresh-token`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                console.log('Token refreshed successfully');
                return true;
            } else {
                console.warn('Token refresh failed, logging out');
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            this.logout();
            return false;
        }
    }

    /**
     * Make authenticated API request with automatic retry on auth failure
     */
    async authenticatedFetch(url, options = {}) {
        const defaultOptions = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        let response = await fetch(url, defaultOptions);

        // If request fails with 401, try to refresh token and retry once
        if (response.status === 401 && !options._retried) {
            console.log('Request failed with 401, attempting token refresh...');
            
            const refreshSuccess = await this.refreshToken();
            
            if (refreshSuccess) {
                // Retry the original request
                defaultOptions._retried = true;
                response = await fetch(url, defaultOptions);
            }
        }

        // If still 401 after refresh attempt, logout
        if (response.status === 401) {
            console.warn('Authentication failed even after refresh, logging out');
            this.logout();
        }

        return response;
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            // Attempt to logout on server
            await fetch(`${this.API_BASE_URL}/users/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Server logout error:', error);
        } finally {
            // Always clear local state
            this.clearAuthState();
            
            // Redirect to login if not on login/register/home pages
            const currentPage = window.location.pathname;
            const publicPages = ['/', '/index.html', '/login.html', '/register.html', '/password-reset-request.html', '/password-reset.html'];
            
            if (!publicPages.includes(currentPage)) {
                window.location.href = '/login.html';
            } else if (typeof checkAuthStatus === 'function') {
                // Update UI if on a page with auth status management
                checkAuthStatus();
            }
        }
    }

    /**
     * Verify authentication status with server
     */
    async verifyAuthStatus() {
        if (!this.isAuthenticated()) {
            return false;
        }

        try {
            const response = await this.authenticatedFetch(`${this.API_BASE_URL}/users/profile`);
            
            if (response.ok) {
                const data = await response.json();
                // Update user data in localStorage
                localStorage.setItem('user', JSON.stringify(data.user));
                return true;
            } else {
                this.clearAuthState();
                return false;
            }
        } catch (error) {
            console.error('Auth verification error:', error);
            this.clearAuthState();
            return false;
        }
    }

    /**
     * Get CSRF token for forms
     */
    async getCsrfToken() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/csrf/token`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.csrfToken;
            }
        } catch (error) {
            console.error('CSRF token fetch error:', error);
        }
        
        return null;
    }

    /**
     * Protect a page (redirect to login if not authenticated)
     */
    async protectPage() {
        const isValid = await this.verifyAuthStatus();
        
        if (!isValid) {
            window.location.href = '/login.html';
            return false;
        }
        
        return true;
    }

    /**
     * Check if user is on a protected page and redirect if not authenticated
     */
    async redirectIfNotAuthenticated() {
        const currentPage = window.location.pathname;
        const protectedPages = ['/profile.html'];
        
        if (protectedPages.includes(currentPage)) {
            return await this.protectPage();
        }
        
        return true;
    }
}

// Create global auth manager instance
window.authManager = new AuthManager();

// Utility functions for backward compatibility
window.logout = () => window.authManager.logout();
window.isAuthenticated = () => window.authManager.isAuthenticated();
window.getCurrentUser = () => window.authManager.getCurrentUser();