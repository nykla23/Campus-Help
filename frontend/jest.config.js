/** @type {import('jest').Config} */
// 配置文件位于 frontend/jest.config.js，所有相对路径相对于此文件
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      diagnostics: false,
      tsconfig: {
        target: 'es2020',
        module: 'commonjs',
        strict: false,
        noUnusedLocals: false,
        noUnusedParameters: false,
        esModuleInterop: true,
        skipLibCheck: true
      }
    }],
    '^.+\\.jsx?$': 'babel-jest'
  },
  transformIgnorePatterns: [],
  setupFilesAfterEnv: ['./miniprogram/jest.setup.js'],
  collectCoverageFrom: [
    'miniprogram/pages/**/*.ts',
    'miniprogram/utils/**/*.ts',
    'miniprogram/api/**/*.ts'
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  forceExit: true
};
