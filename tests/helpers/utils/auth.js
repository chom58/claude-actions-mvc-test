const jwt = require('jsonwebtoken');
const { User } = require('../../../src/models');
const userFactory = require('../factories/user');

class AuthHelper {
  static generateToken(userId, role = 'user') {
    return jwt.sign(
      { userId, role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );
  }

  static async createUserWithToken(overrides = {}) {
    const user = await userFactory.create(overrides);
    const token = this.generateToken(user.id, user.role);
    return { user, token };
  }

  static async createAdminWithToken(overrides = {}) {
    const admin = await userFactory.createAdmin(overrides);
    const token = this.generateToken(admin.id, admin.role);
    return { user: admin, token };
  }

  static getAuthHeaders(token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  static async loginUser(app, email = 'user@test.com', password = 'Test123!') {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password });
    
    return response.body;
  }
}

module.exports = AuthHelper;