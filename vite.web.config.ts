import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "web-spa",
  base: "./",
  plugins: [react()],
  build: {
    outDir: "../crew-app",
    emptyOutDir: true,
    sourcemap: false
  }
});
