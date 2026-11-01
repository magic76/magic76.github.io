const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const shared = [
  "features/shared/design-system.css",
  "web-spa/src/i18n/languageSwitcher.css",
  "web-spa/src/uxReadability.css",
  "web-spa/src/pages/crewSections.css",
  "web-spa/src/teacher/todayLearning.css",
  "web-spa/src/games/crewPlay.css",
  "web-spa/src/styles.css",
  // Protect the 12px minimum established by PR #461.
  "web-spa/src/pages/home.css",
  "web-spa/src/pages/homePortal.css",
  "web-spa/src/pages/homeWorld.css",
];
const read = file => fs.readFileSync(path.join(root, file), "utf8");

// Only the /games hub's eyebrow and voice badge are in scope for crewPlay.css.
// All the following selectors style individual game sessions (voice dock, boards,
// hint/history, result card), not the /games hub. Keep their original design here.
const gameSessionExempt = new Set([
  ".crew-play-friend-name small",
  ".crew-play-friend-select",
  ".crew-play-hint",
  ".crew-play-voice>small",
  ".crew-play-round-label",
  ".crew-play-count",
  ".crew-play-question-grid strong",
  ".crew-play-question-grid button",
  ".crew-play-mystery-source",
  ".crew-play-voice-presence-state",
  ".crew-play-question-disclosure>summary small",
  ".crew-play-history-heading span",
  ".crew-play-history-older summary",
  ".crew-play-voice-dock-shell>small",
  ".crew-play-voice-dock-shell .live-tool-btn",
  ".crew-play-voice-dock-shell .live-manual-interrupt",
  ".crew-play-voice-dock-shell .live-audio-settings",
  ".crew-play-voice-dock-shell .live-status",
  ".crew-play-page--twenty .crew-play-game-header p",
  ".crew-play-voice-dock-shell .live-call-actions .live-tool-btn",
  ".crew-play-voice-paused p",
  ".crew-play-generation-state",
  ".crew-play-page .crew-play-voice-person p",
  ".crew-board-column-labels>span",
  ".crew-board-row-labels>span",
  ".crew-board-coordinate-frame--reversi .crew-board-column-labels>span b",
  ".crew-board-coordinate-frame--reversi .crew-board-column-labels>span small",
  ".crew-play-sample-lines p",
  ".crew-play-resume small",
  ".crew-play-result-count", // Raised by uxReadability.css's floor, not in this source's scope.
]);

// styles.css also hosts route-specific CSS for other products. Only examine the
// explicitly requested /teacher, /story and common Google Play selectors.
const stylesScope = new Set([
  ".story-action-tile span",
  ".continue-learning-card p", ".continue-learning-card small",
  ".play-store-copy small", ".play-store-platform",
  ".practice-tutor-strip small", ".practice-tutor-copy em", ".practice-tutor-strip>b",
  ".report-history-summary small", ".report-learning-row small",
  ".story-player-transcript small", ".story-interaction-history summary",
  ".course-track-tabs small", ".course-unit-head p",
  ".course-lesson-copy p", ".course-lesson-meta span",
]);

// Ignore comments without disturbing line numbering.
const stripComments = source => source.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, " "));
function cssRules(source) {
  const css = stripComments(source);
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match => ({
    selectors: match[1].trim().split(",").map(s => s.trim()),
    body: match[2],
    line: css.slice(0, match.index).split("\n").length,
  }));
}
function minPx(value) {
  const input = value.trim();
  const first = input.startsWith("clamp(")
    ? input.slice(6).split(",", 1)[0].trim()
    : input;
  const unit = first.match(/^(\d*\.?\d+)\s*(px|rem|em)\b/i);
  if (!unit) return null;
  return Number(unit[1]) * (unit[2].toLowerCase() === "px" ? 1 : 16);
}
function fontValues(body) {
  return [...body.matchAll(/(?:^|;)\s*font-size\s*:\s*([^;}]*)/g)].map(m => m[1].trim());
}
function outOfScope(file, selectors) {
  if (selectors.some(s => s.includes(".fortune-") || s.includes("fortune-home-mode"))) {
    // Existing mixed rules are acceptable at >=12px; a sub-12 shared rule
    // cannot hide behind an excluded Fortune selector.
    const mixed = selectors.some(s => !s.includes(".fortune-") && !s.includes("fortune-home-mode"));
    if (mixed && file === "web-spa/src/styles.css" &&
        selectors.some(s => stylesScope.has(s))) return false;
    if (mixed && file !== "web-spa/src/styles.css") {
      assert.fail(`${file}: split Fortune from shared selectors before changing font-size`);
    }
    return true;
  }
  if (file === "web-spa/src/styles.css") return selectors.every(s => !stylesScope.has(s));
  if (file === "web-spa/src/games/crewPlay.css") {
    if (selectors.every(s => gameSessionExempt.has(s))) return true;
    // Guard against adding another unreviewed <12px rule on the game hub.
  }
  return false;
}

test("shared chrome, named route surfaces, and PR #461 home styles keep a 12px font-size floor", () => {
  const checked = new Set();
  for (const file of shared) {
    const errors = [];
    for (const {selectors, body, line} of cssRules(read(file))) {
      const values = fontValues(body);
      if (!values.length) continue;
      if (outOfScope(file, selectors)) continue;
      if (file === "web-spa/src/styles.css") {
        for (const s of selectors) if (stylesScope.has(s)) checked.add(s);
      }
      for (const value of values) {
        const px = minPx(value);
        if (px !== null && px < 12) {
          errors.push(`${file}:${line} ${selectors.join(", ")} has font-size:${value} (${px}px)`);
        }
      }
    }
    assert.deepEqual(errors, [], errors.join("\n"));
  }
  assert.deepEqual([...stylesScope].filter(s => !checked.has(s)), [],
    "styles.css: required selectors must retain a font-size declaration");
});

test("readability floor is 12px, with only Fortune's original 11px rule exempt", () => {
  const css = stripComments(read("web-spa/src/uxReadability.css"));
  assert.match(css, /:root\s+\.fortune-home-mode span\{font-size:11px\}/);
  const withoutFortune = css.replace(/:root\s+\.fortune-home-mode span\{font-size:11px\}/, "");
  assert.doesNotMatch(withoutFortune, /font-size\s*:\s*11px\b/);
  assert.match(withoutFortune, /:root\s+\.books-card-meta span\{font-size:12px\}/);
});

test("mobile chrome keeps readable header controls and fixed icon rows for localized labels", () => {
  const chrome = read("features/shared/design-system.css");
  const picker = read("web-spa/src/i18n/languageSwitcher.css");
  assert.match(chrome, /--nav-h:68px/);
  assert.match(chrome, /\.app-header \.inner\{height:58px;/);
  const subtitle = cssRules(chrome).find(rule => rule.selectors.includes(".app-title small"));
  const navLabel = cssRules(chrome).find(rule => rule.selectors.includes(".navitem span:not(.nav-icon)"));
  assert.ok(subtitle && navLabel, "Localized chrome selectors must remain present");
  for (const {body, selectors} of [subtitle, navLabel]) {
    assert.match(body, /font-size:12px|line-height:1\.1/, selectors.join(", "));
    assert.match(body, /white-space:normal/);
    assert.match(body, /overflow-wrap:anywhere/);
    assert.doesNotMatch(body, /text-overflow:ellipsis|overflow:hidden|white-space:nowrap/);
  }
  assert.match(subtitle.body, /font-size:12px/);
  assert.match(navLabel.body, /line-height:1\.1/);
  assert.match(chrome, /\.navitem\{[^}]*min-width:0;[^}]*font-size:12px/);
  assert.match(picker, /\.crew-language-picker-header \.crew-language-trigger\{[^}]*max-width:92px;[^}]*font-size:12px/);
  const overrides = read("web-spa/src/styles.css");
  const switcher = read("web-spa/src/i18n/LanguageSwitcher.tsx");
  // The baseline remains readable; mobile overrides use normal word wrapping
  // and fixed icon rows, including the later-loaded active-icon motion rule.
  assert.match(overrides, /grid-template-rows:26px 27px/);
  assert.match(overrides, /overflow-wrap:normal;word-break:normal;hyphens:none/);
  assert.match(overrides, /:root \.global-nav \.navitem\.active \.nav-icon\{transform:none\}/);
  assert.match(picker, /max-width:92px;min-height:44px/);
  assert.match(picker, /\.crew-language-picker-header \.crew-language-trigger-name\{[^}]*overflow:visible;text-overflow:clip/);
  assert.match(switcher, /variant==="header"\?compactLabel:currentLabel/);
  assert.match(switcher, /aria-label=\{t\("language.label"\)\+": "\+currentLabel\}/);

});

// Source-level guard for precisely the follow-up scope. Intentionally excludes
// Fortune internals, Magic, game boards and other deferred low-size areas.
const followupSelectors = {
  "web-spa/src/styles.css": [
    ".story-player-live-status", ".practice-next-card p", ".practice-next-action", ".course-map-summary span",
    ".teacher-current-row small", ".teacher-profile-copy strong em", ".teacher-profile-copy b",
    ".teacher-profile-copy small", ".story-continue-card p", ".story-dialogue strong", ".story-tag-row span",
    ".report-history-body h4", ".report-history-body p", ".report-learning-row strong",
    ".story-interaction-history p", ".course-lesson-index", ".course-track-intro p",
    ".story-book-open-label", ".story-book-edit", ".story-book-menu button",
    ".teacher-gallery-type", ".teacher-gallery-tagline", ".teacher-gallery-selected",
    ".teacher-detail-facts strong", ".teacher-gallery-footer p", ".teacher-segmented button",
    ".story-player-placeholder small",
  ],
  "features/teacher/practice/styles.css": [
    ".practice-stat", ".course-card p", ".mission", ".reading-card small", ".reading-tip", ".report-stat span",
  ],
  "features/teacher/textbook/styles.css": [
    ".textbook-page-row small", ".textbook-note b", ".keyword", ".textbook-resume small",
  ],
  "features/story/styles.css": [
    ".story-book p", ".story-home-empty a", ".story-home-empty span", ".story-home-copy small", ".story-home-copy span",
  ],
  "web-spa/src/friends/friends.css": [".friend-live-footnote"],
  "web-spa/src/teacher/learningFlow.css": [
    ".crew-learning-translation-note", ".crew-course-mission-summary span", ".crew-course-unit-title small",
    ".crew-course-lesson-copy small", ".crew-course-lesson-copy em", ".crew-course-warmup small",
    ".crew-course-briefing-footnote", ".crew-vocab-voice-hint", ".crew-course-track-tabs small",
  ],
};

test("follow-up teacher, story, practice, textbook and learning CSS declarations are at least 12px", () => {
  for (const [file, selectors] of Object.entries(followupSelectors)) {
    const rules = cssRules(read(file));
    for (const selector of selectors) {
      const matched = rules.filter(rule => rule.selectors.includes(selector) && fontValues(rule.body).length);
      assert.ok(matched.length, `${file}: ${selector} must have a font-size declaration`);
      for (const {body, line} of matched) {
        for (const value of fontValues(body)) {
          const px = minPx(value);
          assert.ok(px !== null && px >= 12, `${file}:${line} ${selector}: ${value} must be >=12px`);
        }
      }
    }
  }
});

test("shared text-button preserves Fortune 10px and teacher Fortune hub 13px", () => {
  const rules = cssRules(read("web-spa/src/styles.css"));
  const valuesFor = selector => rules.filter(rule => rule.selectors.includes(selector)).flatMap(rule => fontValues(rule.body));
  // The original shared base remains 10px, while non-Fortune action containers
  // explicitly override it to 12px (without touching any Fortune selector).
  assert.deepEqual(valuesFor(".text-button"), ["10px"]);
  assert.deepEqual(valuesFor(".story-player-secondary-actions .text-button"), ["12px"]);
  assert.deepEqual(valuesFor(".learning-deck-card .text-button"), ["12px"]);
  const fortuneHub = read("web-spa/src/teacher/fortuneHub.css");
  assert.match(fortuneHub, /text-button[^{}]*\{[^}]*font-size\s*:\s*13px/,
    "Teacher Fortune hub must retain its existing 13px override");
});
