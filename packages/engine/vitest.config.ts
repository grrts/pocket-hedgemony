import { defineConfig } from "vitest/config";

// Engine tests run whole campaigns; beside the long war soak a CI runner can
// take well over vitest's 5 s default on an ordinary test.
export default defineConfig({ test: { testTimeout: 30_000 } });
