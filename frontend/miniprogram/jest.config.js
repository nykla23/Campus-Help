/** @type {import('jest').Config} */
module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript'
      ]
    }]
  },
  setupFilesAfterEnv: ['./jest.setup.js'],
  collectCoverageFrom: [
    'pages/**/*.ts',
    '!pages/index/index.ts',
    'utils/**/*.ts',
    'api/**/*.ts'
  ],
  coverageDirectory: '../../coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true
};
