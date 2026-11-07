import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import {createCrewPwaIcon,createCrewShortcutIcon} from "./scripts/pwa-icons.mjs";

const isCloudflareBuild = process.env.CREW_DEPLOY_TARGET === "cloudflare";

type BuildInfo = {
  schema: 1;
  buildId: string | null;
  builtAt: string | null;
  commit: string | null;
  version: string | null;
  environment: string;
};

function resolveCommit(): string | null {
  const fromEnv = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA;
  if (fromEnv && /^[0-9a-f]{7,40}$/i.test(fromEnv)) return fromEnv;
  try {
    const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return /^[0-9a-f]{7,40}$/i.test(sha) ? sha : null;
  } catch {
    return null;
  }
}

function createBuildInfo(isBuild: boolean): BuildInfo {
  const branch = process.env.CF_PAGES_BRANCH || process.env.GITHUB_REF_NAME;
  const environment = isCloudflareBuild
    ? branch ? (branch === "master" || branch === "main" ? "Production" : "Preview") : "Cloudflare Pages"
    : isBuild ? "GitHub Pages" : "Development";
  if (!isBuild) return { schema: 1, buildId: null, builtAt: null, commit: null, version: null, environment };
  const builtAt = new Date().toISOString();
  const commit = resolveCommit();
  const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as { version?: string };
  // The repo has no release version; never invent a semantic version.
  const version = typeof pkg.version === "string" && pkg.version.trim() ? pkg.version : null;
  return {
    schema: 1,
    buildId: (commit?.slice(0, 8) || "unknown") + "-" + Date.now().toString(36),
    builtAt,
    commit,
    version,
    environment
  };
}

export default defineConfig(({ command }) => {
  const buildInfo = createBuildInfo(command === "build");
  const versionAsset: Plugin = {
    name: "crew-version-asset",
    apply: "build",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify(buildInfo, null, 2) + "\n" });
    }
  };
  return {
    root: "web-spa",
    // GitHub Pages continues serving the legacy HashRouter build until DNS cutover.
    base: isCloudflareBuild ? "/" : "./",
    plugins: [react(), versionAsset, {
      name: "crew-pwa-icons",
      apply: "build",
      generateBundle() {
        for (const [name,size,maskable] of [["crew-180.png",180,false],["crew-192.png",192,false],["crew-512.png",512,false],["crew-maskable-512.png",512,true]] as const) {
          this.emitFile({type:"asset",fileName:"icons/"+name,source:createCrewPwaIcon(size,maskable)});
        }
        for (const kind of ["chat","learn","games"] as const) {
          for (const size of [96,192] as const) {
            this.emitFile({type:"asset",fileName:`icons/shortcut-${kind}-${size}.png`,source:createCrewShortcutIcon(kind,size)});
          }
        }
      }
    }],
    define: { __CREW_BUILD_INFO__: JSON.stringify(buildInfo) },
    build: {
      manifest: true,
      outDir: isCloudflareBuild ? "../dist" : "../crew-app",
      emptyOutDir: true,
      sourcemap: false,
      // Keep content-hashed build files separate from the unversioned /assets/
      // illustrations. Only /assets/build/ receives an immutable cache header.
      rolldownOptions: {
        output: {
          entryFileNames: "assets/build/[name]-[hash].js",
          chunkFileNames: "assets/build/[name]-[hash].js",
          assetFileNames: "assets/build/[name]-[hash][extname]"
        }
      }
    }
  };
});
