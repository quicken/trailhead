import { defineConfig } from "vite";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  server: {
    port: 3001,
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
        inlineDynamicImports: true,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});
