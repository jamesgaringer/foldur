import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@foldur/core": path.resolve(__dirname, "../../packages/core/src"),
      "@foldur/db": path.resolve(__dirname, "../../packages/db/src"),
      "@foldur/adapters": path.resolve(__dirname, "../../packages/adapters/src"),
      "@foldur/pipeline": path.resolve(__dirname, "../../packages/pipeline/src"),
      "@foldur/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@foldur/embeddings": path.resolve(__dirname, "../../packages/embeddings/src"),
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 5174 } : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
