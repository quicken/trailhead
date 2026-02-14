import { defineConfig, loadEnv } from "vite";
import react from '@vitejs/plugin-react';
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH ? `${env.VITE_BASE_PATH}/` : "/";
  
  return {
    base,
    plugins: [react()],
    resolve: {
      alias: {
        '../../core/shell/src': path.resolve(__dirname, '../../../core/shell/src'),
      },
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
    server: {
      open: true,
      port: 3001,
      cors: true,
    },
    preview: {
      port: 3001,
    },
  };
});

