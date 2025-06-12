// Why this exists: Configure Jest so we can run tests on the TypeScript source.
// What it does: Specifies presets, transforms and module mappings used during
// test execution so Jest understands our TypeScript files.
// How it works: Jest reads this exported object to know how to transform and
// locate test files before running them.
module.exports = {
  preset: "ts-jest/presets/js-with-ts-esm",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { useESM: true }],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!globby|chalk|ansi-styles|supports-color|unicorn-magic)/",
  ],
  moduleNameMapper: {
    "^globby$": "<rootDir>/node_modules/globby/index.js",
    "^chalk$": "<rootDir>/node_modules/chalk/source/index.js",
  },
};
