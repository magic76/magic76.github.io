import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const guest = read("web-spa/src/lib/firebaseGuest.ts");
const page = read("web-spa/src/pages/FirebaseGuestLivePage.tsx");
const vite = read("vite.web.config.ts");

test("manual Firebase preview is restricted to the named Cloudflare branch host", () => {
  assert.match(guest, /return onAllowedPreviewHost\(\);/);
  assert.match(guest, /magic76-github-io/);
  assert.match(guest, /if \(!guestManualPreviewAvailable\(\)\) throw/);
  assert.match(guest, /previewOverrides && onAllowedPreviewHost\(\)/);
  assert.doesNotMatch(guest, /sessionStorage\.setItem\(.*previewOverrides/);
  assert.doesNotMatch(guest, /localStorage\.setItem\(.*previewOverrides/);
});

test("preview manual config makes the guest flow usable without Vite build env", () => {
  assert.match(guest, /function config\(\): GuestWebConfig \{/);
  assert.match(guest, /!previewOverrides/);
  assert.match(guest, /previewOverrides !== null/);
  assert.match(page, /manualPreview && <section/);
  for (const field of ["firebase-preview-api-key", "firebase-preview-app-id", "firebase-preview-project-id"]) {
    assert.ok(page.includes(field), field);
  }
  assert.match(page, /configureGuestManualPreview\(/);
  assert.match(page, /window\.location\.reload\(\)/);
  assert.match(page, /App Check/);
});

test("Cloudflare build diagnostics report presence only, never actual values", () => {
  assert.match(vite, /loadEnv\(mode,/);
  assert.match(vite, /"PRESENT" : "MISSING"/);
  assert.match(vite, /\[Crew Firebase\]/);
  assert.doesNotMatch(vite, /console\.(?:info|log)\([^\n]*process\.env\[name\]/);
  assert.doesNotMatch(vite, /console\.(?:info|log)\([^\n]*loaded\[name\]/);
});
