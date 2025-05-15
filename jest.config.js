module.exports = {
  preset: 'ts-jest/presets/js-with-ts-esm',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }]
  },
  transformIgnorePatterns: ['/node_modules/(?!globby|chalk|ansi-styles|supports-color)/'],
  moduleNameMapper: {
    '^globby$': '<rootDir>/node_modules/globby/index.js',
    '^chalk$': '<rootDir>/node_modules/chalk/source/index.js'
  }
};