import { defineConfig } from "vitest/config";

// The tests play a few weeks of small made-up worlds, never a real campaign.
// Tests read the 1444 checkpoint world (rules/src/start.ts) unless a test asks for another start.
export default defineConfig({ test: { env: { PH_START: process.env.PH_START ?? "1444" }, testTimeout: 60_000, hookTimeout: 60_000 } });
