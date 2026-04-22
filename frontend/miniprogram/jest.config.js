/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.jsx', '**/__tests__/**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'pages/**/*.ts',
    '!pages/**/index.ts'
  ],
  coverageDirectory: '../../coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true
};
