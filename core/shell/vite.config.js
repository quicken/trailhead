import { defineConfig } from "vite";

export default defineConfig({
  base: "",
  build: {
    manifest: true,
    rollupOptions: {
      input: {
        main: "./index.html",
      },
      output: {
        entryFileNames: "shell.js",
        assetFileNames: "shell.[ext]",
      },
    },
    copyPublicDir: true,
  },
  server: {
    open: true,
    port: 3000,
    cors: true,
  },
  preview: {
    port: 3000,
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});
