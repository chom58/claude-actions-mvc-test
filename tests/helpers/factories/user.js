const { faker } = require('@faker-js/faker');
const { User } = require('../../../src/models');

const userFactory = {
  build: (overrides = {}) => ({
    email: faker.internet.email(),
    username: faker.internet.userName(),
    password: 'Test123!',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    role: 'user',
    isEmailVerified: true,
    ...overrides
  }),
  
  create: async (overrides = {}) => {
    const userData = userFactory.build(overrides);
    return await User.create(userData);
  },
  
  createMany: async (count, overrides = {}) => {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push(await userFactory.create(overrides));
    }
    return users;
  },

  adminUser: (overrides = {}) => userFactory.build({
    role: 'admin',
    email: 'admin@test.com',
    username: 'admin',
    ...overrides
  }),

  createAdmin: async (overrides = {}) => {
    const adminData = userFactory.adminUser(overrides);
    return await User.create(adminData);
  }
};

module.exports = userFactory;