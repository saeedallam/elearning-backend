module.exports = {
  rootDir: '.',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testEnvironment: 'node',

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },

  testMatch: ['<rootDir>/test/**/*.spec.ts'],

  collectCoverageFrom: ['src/**/*.{ts,js}'],

  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],

  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
};
