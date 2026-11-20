const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { stripTypeScriptTypes } = require("node:module");
const path = require("node:path");
const vm = require("node:vm");

const source = stripTypeScriptTypes(readFileSync(path.join(__dirname, "../web-spa/src/live/useLiveSession.ts"), "utf8"))
  .replace(/\bimport\s*(\{[^}]*\})\s*from\s*("[^"]+");/g, "const $1 = require($2);")
  .replace("export function useLiveSession", "exports.useLiveSession = function useLiveSession");

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function harness({
  ensureLive = async () => {},
  startSession = async () => {},
  stopSession = async () => {},
  teacherReport,
} = {}) {
  const sessions = [], saved = [], slots = [], cleanups = [];
  let cursor = 0, effects = 0, callsToEnsureLive = 0;
  let config = { pageKey: "friend-zoe", title: "Zoe", system: "", openingPrompt: "", voice: "Zoe" };
  const exports = {};
  const react = {
    useRef(value) { return slots[cursor++] ??= { current: value }; },
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useCallback(fn) { return fn; },
    useEffect(fn) {
      const index = effects++;
      if (!(index in cleanups)) cleanups[index] = fn();
    },
  };
  class Session {
    constructor(options) { this.options = options; this.stops = []; sessions.push(this); }
    async start() {
      await startSession(this);
      this.running = this.ready = true;
      this.options.onState("ready");
    }
    async stop(options) {
      this.stops.push(options.reason);
      await stopSession(this);
      this.running = this.ready = false;
    }
    setVolume() {}
    getDurationMs() { return 1000; }
  }
  const window = {
    CrewLive: { Session }, CrewTeacherReport: teacherReport,
    setInterval: () => 0, setTimeout: () => 0, clearTimeout: () => {},
  };
  const deps = {
    react,
    "../store/teacherStore": { useTeacherStore: { getState: () => ({}) } },
    "../analytics/usage": { trackUsageEvent: () => {} },
    "../teacher/studentMemory": {
      getPersonalMemoryEpoch: () => 0, reportMemoryContext: () => [],
      ingestStudentReport: () => {}, personalMemoryEnabled: () => false,
    },
    "../teacher/speakingLevelMemory": { effectiveSpeakingLevel: () => "beginner" },
    "./turnTiming": { turnTimingForLevel: () => undefined },
    "../lib/runtime": {
      geminiKey: () => "test-key",
      ensureLive: () => { callsToEnsureLive++; return ensureLive(); },
      ensureTeacherServices: async () => {},
      saveLive: (key, item) => saved.push({ key, item }),
    },
    "./conversationFlow": { ConversationFlowState: class { observe() {} } },
    "./grounding": {},
  };
  vm.runInNewContext(source, {
    exports, window, require: name => deps[name], clearInterval: () => {},
  });
  return {
    sessions, saved, callsToEnsureLive: () => callsToEnsureLive,
    render(changes) { Object.assign(config, changes); cursor = effects = 0; return exports.useLiveSession({ ...config }); },
    unmount() { for (const cleanup of cleanups) cleanup?.(); },
  };
}

test("two starts during the first runtime load open a single Live session", async () => {
  const runtime = deferred(), app = harness({ ensureLive: () => runtime.promise });
  const live = app.render();
  const first = live.start(), second = live.start();
  assert.equal(app.callsToEnsureLive(), 1);
  runtime.resolve();
  await Promise.all([first, second]);
  assert.equal(app.sessions.length, 1);
  await live.stop();
});

test("unmount during runtime loading prevents a late start", async () => {
  const runtime = deferred(), app = harness({ ensureLive: () => runtime.promise });
  const live = app.render();
  const start = live.start();
  app.unmount();
  runtime.resolve();
  await start;
  assert.equal(app.sessions.length, 0);
});

test("explicit stop during runtime loading cancels the first attempt and permits retry", async () => {
  const firstRuntime = deferred(), secondRuntime = deferred();
  const pending = [firstRuntime, secondRuntime];
  const app = harness({ ensureLive: () => pending.shift().promise });
  const live = app.render();
  const first = live.start();
  assert.equal(await live.stop(), null);
  const retry = live.start();
  secondRuntime.resolve();
  await retry;
  firstRuntime.reject(new Error("stale runtime failure"));
  await first;
  assert.equal(app.sessions.length, 1);
  assert.equal(app.render().state, "listening");
  await live.stop();
  assert.deepEqual(app.sessions[0].stops, ["user-stop"]);
});

test("a call cannot start during explicit cleanup and retired callbacks cannot alter the next call", async () => {
  const cleanup = deferred();
  const app = harness({ stopSession: session => session === app.sessions[0] ? cleanup.promise : Promise.resolve() });
  const live = app.render();
  await live.start();
  const stopped = live.stop();
  const repeatStop = live.stop();
  await live.start();
  assert.equal(app.sessions.length, 1);
  cleanup.resolve();
  await Promise.all([stopped, repeatStop]);
  await live.start();
  app.sessions[0].options.onError(new Error("stale"));
  app.sessions[0].options.onTerminal({ state: "error" });
  app.sessions[0].options.onInputTranscript("stale");
  assert.equal(app.render().state, "listening");
  assert.equal(app.render().input, "");
  await live.stop();
  assert.deepEqual(app.sessions.map(session => session.stops), [["user-stop"], ["user-stop"]]);
});

test("unmount during session startup closes the acquired session exactly once", async () => {
  const setup = deferred(), constructed = deferred();
  const app = harness({ startSession: () => { constructed.resolve(); return setup.promise; } });
  const live = app.render();
  const start = live.start();
  await constructed.promise;
  app.unmount();
  setup.reject(new Error("startup canceled"));
  await start;
  assert.deepEqual(app.sessions[0].stops, ["page-leave"]);
  assert.equal(app.render().state, "requesting-mic");
});

test("a deferred report retains the ended session's config and leaves the new call UI alone", async () => {
  const report = deferred(), notified = [];
  const app = harness({ teacherReport: { eligible: () => true, generate: () => report.promise } });
  const old = app.render({ teacherReport: true, onSessionFinished: () => notified.push("old") });
  await old.start();
  const turn = { input: "Hello", output: "Hi" };
  app.sessions[0].options.onTranscriptTurn(turn, [turn]);
  const stopped = await old.stop(true);
  const next = app.render({ pageKey: "friend-next", onSessionFinished: () => notified.push("next") });
  await next.start();
  const oldReport = { summary: "first call" };
  report.resolve(oldReport);
  await stopped.completion;
  assert.equal(app.saved.at(-1).key, "friend-zoe");
  assert.equal(app.saved.at(-1).item.report, oldReport);
  assert.equal(app.render().state, "listening");
  assert.equal(app.render().report, null);
  assert.deepEqual(notified, ["old"]);
  await next.stop();
});
