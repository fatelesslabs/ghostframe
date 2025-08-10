import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  // Use the renderer app folder as the project root
  root: __dirname,
  plugins: [react(), tailwindcss()],
  base: "./",
  build: {
    // Emit renderer bundle at repo root out/renderer
    outDir: path.resolve(__dirname, "../../out/renderer"),
    emptyOutDir: true,
  },
  server: {
    port: 5123,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
