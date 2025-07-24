const request = require('supertest');
const app = require('../../src/app');
const { User } = require('../../src/models');
const OAuthService = require('../../src/services/oauthService');

// Mock axios for OAuth API calls
jest.mock('axios');
const axios = require('axios');

describe('Social Authentication', () => {
  beforeEach(async () => {
    await User.destroy({ where: {} });
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/social-auth/urls', () => {
    it('should return social login URLs when config is valid', async () => {
      // Mock valid config
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
      process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
      process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret';

      const response = await request(app)
        .get('/api/social-auth/urls')
        .expect(200);

      expect(response.body.message).toBe('ソーシャルログインURLを取得しました');
      expect(response.body.urls).toBeDefined();
      expect(response.body.urls.google).toContain('accounts.google.com');
      expect(response.body.urls.github).toContain('github.com');
      expect(response.body.configStatus).toEqual({
        google: 'OK',
        github: 'OK'
      });
    });

    it('should return errors for invalid config', async () => {
      // Clear environment variables
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.GITHUB_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_SECRET;

      const response = await request(app)
        .get('/api/social-auth/urls')
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.configStatus.google).toBe('ERROR');
      expect(response.body.configStatus.github).toBe('ERROR');
    });
  });

  describe('GET /api/social-auth/config-status', () => {
    it('should return OAuth configuration status', async () => {
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';

      const response = await request(app)
        .get('/api/social-auth/config-status')
        .expect(200);

      expect(response.body.message).toBe('OAuth設定状態を取得しました');
      expect(response.body.providers).toBeDefined();
      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.total).toBe(2); // Google and GitHub
    });
  });

  describe('Google OAuth Flow', () => {
    beforeEach(() => {
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/social-auth/google/callback';
    });

    it('should handle successful Google OAuth callback', async () => {
      // Mock Google OAuth API responses
      axios.post.mockResolvedValueOnce({
        data: { access_token: 'mock-access-token' }
      });
      
      axios.get.mockResolvedValueOnce({
        data: {
          id: 'google_123456',
          email: 'testuser@gmail.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
          verified_email: true
        }
      });

      const response = await request(app)
        .get('/api/social-auth/google/callback?code=mock-auth-code')
        .expect(302); // Redirect

      expect(response.headers.location).toContain('/auth/callback');
      expect(response.headers.location).toContain('token=');
      expect(response.headers.location).toContain('provider=google');

      // Verify user was created
      const user = await User.findOne({ where: { email: 'testuser@gmail.com' } });
      expect(user).toBeTruthy();
      expect(user.username).toBe('Test User');
    });

    it('should handle existing user login', async () => {
      // Create existing user
      await User.create({
        username: 'existinguser',
        email: 'existing@gmail.com',
        password: 'password123'
      });

      // Mock Google OAuth API responses
      axios.post.mockResolvedValueOnce({
        data: { access_token: 'mock-access-token' }
      });
      
      axios.get.mockResolvedValueOnce({
        data: {
          id: 'google_123456',
          email: 'existing@gmail.com',
          name: 'Existing User',
          verified_email: true
        }
      });

      const response = await request(app)
        .get('/api/social-auth/google/callback?code=mock-auth-code')
        .expect(302);

      // Verify user's lastLoginAt was updated
      const user = await User.findOne({ where: { email: 'existing@gmail.com' } });
      expect(user.lastLoginAt).toBeTruthy();
    });

    it('should handle OAuth error', async () => {
      const response = await request(app)
        .get('/api/social-auth/google/callback?error=access_denied')
        .expect(302);

      expect(response.headers.location).toContain('/auth/error');
      expect(response.headers.location).toContain('error=access_denied');
    });

    it('should handle missing authorization code', async () => {
      const response = await request(app)
        .get('/api/social-auth/google/callback')
        .expect(400);

      expect(response.body.error).toBe('認証コードが提供されていません');
    });

    it('should handle Google API errors', async () => {
      axios.post.mockRejectedValueOnce({
        response: {
          data: { error_description: 'Invalid authorization code' }
        }
      });

      const response = await request(app)
        .get('/api/social-auth/google/callback?code=invalid-code')
        .expect(302);

      expect(response.headers.location).toContain('/auth/error');
      expect(response.headers.location).toContain('message=');
    });
  });

  describe('GitHub OAuth Flow', () => {
    beforeEach(() => {
      process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
      process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret';
      process.env.GITHUB_REDIRECT_URI = 'http://localhost:3000/api/social-auth/github/callback';
    });

    it('should handle successful GitHub OAuth callback', async () => {
      // Mock GitHub OAuth API responses
      axios.post.mockResolvedValueOnce({
        data: { access_token: 'mock-access-token' }
      });
      
      // Mock user info response
      axios.get.mockResolvedValueOnce({
        data: {
          id: 'github_123456',
          login: 'testuser',
          name: 'Test User',
          avatar_url: 'https://github.com/avatar.jpg'
        }
      });
      
      // Mock emails response
      axios.get.mockResolvedValueOnce({
        data: [
          { email: 'testuser@example.com', primary: true, verified: true }
        ]
      });

      const response = await request(app)
        .get('/api/social-auth/github/callback?code=mock-auth-code')
        .expect(302);

      expect(response.headers.location).toContain('/auth/callback');
      expect(response.headers.location).toContain('provider=github');

      // Verify user was created
      const user = await User.findOne({ where: { email: 'testuser@example.com' } });
      expect(user).toBeTruthy();
      expect(user.username).toBe('Test User');
    });

    it('should handle GitHub user without verified email', async () => {
      axios.post.mockResolvedValueOnce({
        data: { access_token: 'mock-access-token' }
      });
      
      axios.get.mockResolvedValueOnce({
        data: {
          id: 'github_123456',
          login: 'testuser',
          name: 'Test User'
        }
      });
      
      // Mock emails response with no verified email
      axios.get.mockResolvedValueOnce({
        data: [
          { email: 'testuser@example.com', primary: true, verified: false }
        ]
      });

      const response = await request(app)
        .get('/api/social-auth/github/callback?code=mock-auth-code')
        .expect(302);

      // Should still work with unverified email
      expect(response.headers.location).toContain('/auth/callback');
    });

    it('should handle GitHub API rate limiting', async () => {
      axios.post.mockRejectedValueOnce({
        response: {
          status: 403,
          data: { message: 'API rate limit exceeded' }
        }
      });

      const response = await request(app)
        .get('/api/social-auth/github/callback?code=mock-code')
        .expect(302);

      expect(response.headers.location).toContain('/auth/error');
    });
  });

  describe('OAuthService', () => {
    describe('validateConfig', () => {
      it('should validate Google config correctly', () => {
        process.env.GOOGLE_CLIENT_ID = 'test-id';
        process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
        process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/callback';

        const result = OAuthService.validateConfig('google');
        expect(result.valid).toBe(true);
      });

      it('should detect missing Google config', () => {
        delete process.env.GOOGLE_CLIENT_ID;
        
        const result = OAuthService.validateConfig('google');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('clientId');
      });

      it('should reject unsupported provider', () => {
        const result = OAuthService.validateConfig('unsupported');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('サポートされていない');
      });
    });

    describe('generateAuthUrl', () => {
      it('should generate Google auth URL with state', () => {
        const url = OAuthService.generateAuthUrl('google', 'test-state');
        expect(url).toContain('accounts.google.com');
        expect(url).toContain('state=test-state');
        expect(url).toContain('client_id=');
      });

      it('should generate GitHub auth URL', () => {
        const url = OAuthService.generateAuthUrl('github');
        expect(url).toContain('github.com/login/oauth/authorize');
        expect(url).toContain('client_id=');
      });

      it('should throw error for unsupported provider', () => {
        expect(() => {
          OAuthService.generateAuthUrl('unsupported');
        }).toThrow('サポートされていない');
      });
    });
  });
});