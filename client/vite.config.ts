import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "../shared"),
      "@assets": path.resolve(__dirname, "../attached_assets"),
    },
  },
  root: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port: parseInt(process.env.VITE_PORT || "3000"),
    host: process.env.VITE_HOST || "localhost",
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: process.env.VITE_API_URL 
      ? undefined 
      : {
          '/api': {
            target: 'http://localhost:5000',
            changeOrigin: true,
            secure: false,
          },
          '/uploads': {
            target: 'http://localhost:5000',
            changeOrigin: true,
            secure: false,
          },
        },
  },
});