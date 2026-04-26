import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3000,
    cors: true,
    proxy: {
      "/favicon.ico": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
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
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "app.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
