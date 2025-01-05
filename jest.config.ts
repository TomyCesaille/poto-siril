import type { JestConfigWithTsJest } from "ts-jest";

const jestConfig: JestConfigWithTsJest = {
  preset: "ts-jest/presets/default-esm", // Use ESM-compatible preset
  extensionsToTreatAsEsm: [".ts"], // Treat these extensions as ESM
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true }], // Use ts-jest to handle TypeScript files with ESM
  },
  testEnvironment: "node", // Use Node.js environment
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1", // Map module paths correctly
  },
  transformIgnorePatterns: [
    "/node_modules/(?!chalk|ansi-escapes)", // Ensure node_modules are transformed correctly
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"], // Add custom matcher setup file
};

export default jestConfig;
