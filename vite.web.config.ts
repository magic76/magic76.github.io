import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const isCloudflareBuild = process.env.CREW_DEPLOY_TARGET === "cloudflare";

export default defineConfig({
  root: "web-spa",
  // GitHub Pages continues serving the legacy HashRouter build until DNS cutover.
  base: isCloudflareBuild ? "/" : "./",
  plugins: [react()],
  build: {
    outDir: isCloudflareBuild ? "../dist" : "../crew-app",
    emptyOutDir: true,
    sourcemap: false
  }
});
