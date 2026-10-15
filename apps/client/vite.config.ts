import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset URLs so the same build loads from a web server, Electron's
  // app:// protocol and Capacitor's local webview server.
  base: "./",
  build: {
    // Safari 15 is the oldest engine that runs module workers; it covers iOS 15+.
    target: ["es2022", "safari15", "chrome100"],
    // The bundled world data (provinces, nations) is most of the size.
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: { game: "index.html", style: "style.html" },
    },
  },
  worker: {
    format: "es",
  },
});
