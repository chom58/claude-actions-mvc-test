module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js',
    '!src/config/*.js',
    '!src/seeders/**/*.js',
    '!src/migrations/**/*.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: [
    '**/tests/**/*.test.js',
    '!**/tests/e2e/**',
    '!**/tests/fixtures/**',
    '!**/tests/helpers/**',
    '!**/tests/utils/**'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  verbose: true,
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'Test Report',
      outputPath: 'coverage/test-report.html',
      includeFailureMsg: true,
      includeConsoleLog: true
    }]
  ],
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov'
  ]
};