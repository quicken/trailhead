import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH ? `${env.VITE_BASE_PATH}/` : "/";
  
  return {
    base,
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
  };
});
