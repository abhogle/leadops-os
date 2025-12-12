const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFiles: ['<rootDir>/tests/jestPolyfills.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
  testEnvironment: 'jest-environment-jsdom',
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you soon)
    '^@/(.*)$': '<rootDir>/$1',
    // Map @leadops workspace packages to their dist folders
    '^@leadops/schemas$': '<rootDir>/../../packages/schemas/dist/index.js',
    '^@leadops/types$': '<rootDir>/../../packages/types/dist/index.js',
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.tsx',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/tests-e2e/'],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
// We need to manually override transformIgnorePatterns after Next.js processes the config
module.exports = async () => {
  const jestConfig = await createJestConfig(customJestConfig)()

  // Override transformIgnorePatterns to allow transforming MSW and its ESM dependencies
  jestConfig.transformIgnorePatterns = [
    // Only ignore CSS modules - transform all JS/TS including node_modules (needed for MSW)
    '^.+\\.module\\.(css|sass|scss)$',
  ]

  return jestConfig
}
