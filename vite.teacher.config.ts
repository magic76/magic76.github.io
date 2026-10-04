import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "teacher-spa",
  base: "./",
  plugins: [react()],
  build: {
    outDir: "../teacher-app",
    emptyOutDir: true,
    sourcemap: true
  }
});
