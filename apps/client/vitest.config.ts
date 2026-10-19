import { defineConfig } from "vitest/config";

// Tests read the 1444 checkpoint world (rules/src/start.ts) unless a test asks for another start.
export default defineConfig({ test: { env: { PH_START: process.env.PH_START ?? "1444" }, passWithNoTests: true } });
