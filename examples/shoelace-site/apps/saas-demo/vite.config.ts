import { defineConfig } from "vite";

export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  server: {
    port: 3000,
    cors: true,
    proxy: {
      "/navigation.json": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/trailhead/shell": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/trailhead\/shell/, ""),
      },
      "/shoelace": {
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
        inlineDynamicImports: true,
      },
    },
  },

  test: {
    globals: true,
    environment: "jsdom",
  },
});
