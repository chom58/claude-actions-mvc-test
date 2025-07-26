module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js',
    '!src/config/*.js',
    '!src/seeders/*.js',
    '!src/tasks/*.js'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  verbose: true,
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/tests/e2e/',
    '/tests/performance/'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js',
    '!src/config/*.js',
    '!src/seeders/*.js',
    '!src/tasks/*.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true
};