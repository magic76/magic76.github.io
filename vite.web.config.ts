import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

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

export default defineConfig(({ command, mode }) => {
  const buildInfo = createBuildInfo(command === "build");
  if (isCloudflareBuild && command === "build") {
    // Build-time only; never log variable values or debug tokens.
    // Vite reads env files relative to root=web-spa and merges process.env.
    const loaded = loadEnv(mode, resolve(process.cwd(), "web-spa"), "VITE_");
    const names = [
      "VITE_FIREBASE_API_KEY",
      "VITE_FIREBASE_APP_ID",
      "VITE_FIREBASE_PROJECT_ID",
      "VITE_FIREBASE_APP_CHECK_SITE_KEY",
      "VITE_CREW_GUEST_TRIAL_ENABLED",
      "VITE_CREW_FIREBASE_PREVIEW_DEBUG"
    ];
    console.info("[Crew Firebase] Build configuration check");
    console.info("[Crew Firebase] Environment:", buildInfo.environment);
    for (const name of names) {
      const cloudflare = process.env[name]?.trim() ? "PRESENT" : "MISSING";
      const vite = loaded[name]?.trim() ? "PRESENT" : "MISSING";
      console.info(`[Crew Firebase] ${name}: Cloudflare=${cloudflare}, Vite=${vite}`);
    }
  }
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
    plugins: [react(), versionAsset],
    define: { __CREW_BUILD_INFO__: JSON.stringify(buildInfo) },
    build: {
      outDir: isCloudflareBuild ? "../dist" : "../crew-app",
      emptyOutDir: true,
      sourcemap: false
    }
  };
});
