import { defineConfig } from "vitest/config";

// The tests play a few weeks of small made-up worlds, never a real campaign.
export default defineConfig({ test: { testTimeout: 60_000 } });
