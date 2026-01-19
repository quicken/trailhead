import { defineConfig } from "vite";
import { i18nPlugin } from "@cfkit/vite-plugin-i18n";
import de from "./translations/de.json" assert { type: "json" };

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  plugins: [i18nPlugin(de)],
  server: {
    port: 3001,
    cors: true,
  },
  build: {
    lib: {
      entry: "src/index.tsx",
      formats: ["es"],
      fileName: () => "app.de.js",
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
