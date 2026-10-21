import { defineConfig } from "vitest/config";

// Engine tests run whole campaigns; beside the long war soak a CI runner can
// take well over vitest's 5 s default on an ordinary test.
// Tests read the 1444 checkpoint world (rules/src/start.ts) unless a test asks for another start.
export default defineConfig({ test: { env: { PH_START: process.env.PH_START ?? "1444" }, testTimeout: 30_000 } });
