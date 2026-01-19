import { defineConfig } from "vite";
import { i18nPlugin } from "@cfkit/vite-plugin-i18n";
import de from "./translations/de.json" assert { type: "json" };

export default defineConfig({
  base: "",
  build: {
    manifest: true,
    rollupOptions: {
      input: {
        main: "./index.html",
      },
      output: {
        entryFileNames: "shell.de.js",
        assetFileNames: "shell.[ext]",
      },
    },
  },
  plugins: [i18nPlugin(de)],
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
