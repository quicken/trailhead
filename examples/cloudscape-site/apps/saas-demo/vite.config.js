import { defineConfig } from "vite";

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  server: {
    port: 3000,
    cors: true,
  },
  build: {
    lib: {
      entry: "src/index.tsx",
      formats: ["es"],
      fileName: () => "app.js",
    },
    // Don't externalize React - bundle it
    rollupOptions: {
      output: {
        codeSplitting: false,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});
