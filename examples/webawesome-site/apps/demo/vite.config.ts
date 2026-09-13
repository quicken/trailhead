import { defineConfig } from "vite";

export default defineConfig({
  // React's own runtime picks its dev/prod build via process.env.NODE_ENV; without this,
  // that reference survives into the browser bundle as-is and throws (no `process` global
  // in a browser) instead of being replaced at build time.
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  server: {
    port: 3000,
    cors: true,
    proxy: {
      "/favicon.ico": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/shell.json": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/trailhead/shell": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/trailhead\/shell/, ""),
      },
      "/webawesome": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
    preTransformRequests: false,
  },
  build: {
    lib: {
      entry: "src/index.tsx",
      formats: ["es"],
      fileName: () => "app.js",
    },
    rollupOptions: {
      output: {
        codeSplitting: false,
      },
    },
  },
});
