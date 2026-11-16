import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";

const path="web-spa/public/koolo-preview/";
const html=readFileSync(path+"index.html","utf8");
const css=readFileSync(path+"koolo.css","utf8");
const icon=readFileSync(path+"koolo-mark.svg","utf8");

test("Koolo V1 stays an isolated noindex preview",()=>{
 assert.match(html,/<meta name="robots" content="noindex,nofollow">/);
 assert.match(html,/<html lang="zh-Hant">/);
 assert.match(html,/<title>Koolo 酷囉/);
 assert.doesNotMatch(html,/rel="canonical"|https:\/\/koolo\.app|<script|serviceWorker/);
 assert.match(html,/尚未切換 koolo\.app/);
 assert.ok(existsSync(path+"koolo.css"));
 assert.ok(existsSync(path+"koolo-mark.svg"));
 assert.match(icon,/<svg[\s>]/);
});
test("Koolo CTAs use existing Zoe routes with no new API surface",()=>{
 assert.match(html,/href="https:\/\/www\.3sssi\.com\/friend\/live\?id=zoe&amp;from=home&amp;entry=bubble"/);
 assert.match(html,/href="https:\/\/www\.3sssi\.com\/friend\/live\?id=zoe&amp;from=home&amp;chat=text"/);
 assert.match(html,/href="\/"/);
 assert.doesNotMatch(html,/onclick=|<form\b|api\/|gemini|token/i);
});
test("Koolo is legible and accessible across small viewport layouts",()=>{
 assert.match(html,/id="hero-title"/);
 assert.match(html,/class="kl-skip"/);
 assert.match(html,/src="\/assets\/friends\/crew_friend_zoe.webp"/);
 assert.ok(existsSync("assets/friends/crew_friend_zoe.webp"));
 assert.match(html,/非真實通話截圖/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/\.kl-button\{[^}]*min-height:56px/);
});
