import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_APP_BASE_PATH ? `${env.VITE_APP_BASE_PATH}/` : "/";

  return {
    base,
    server: {
      port: 3001,
    },
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
  };
});
