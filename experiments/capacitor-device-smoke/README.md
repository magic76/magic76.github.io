# Capacitor v8 — independent device capability smoke PoC

This **isolated experiment** compares ready-made native plugins against the
existing origin-scoped AndroidX WebKit adapter. It does **not** wrap the
production Crew site, change any release package or migrate local data.

## Run locally (Android SDK + Gradle + Node)

```sh
cd experiments/capacitor-device-smoke
npm install
npm run android:add     # only the first time
npm run android:run     # after initial setup
```

Requires USB/wireless debugging or an available emulator. The PoC uses bundled
static assets produced by Vite, **not** remote `server.url` production hosting.

## Compare on the same Android device

1. Native TTS: normal / slow; startup latency; missing English voice pack.
2. Camera/photo picker: choose existing photo; cancel; background/foreground.
3. Same operations in **Crew Web Preview** (AndroidX WebKit) and Chrome.
4. Time-to-build APK, binary size, plugin lifecycle, and error reporting.
5. No API key/memory/storage sharing; do not test native Gemini Live here.

**Decision gate:** keep the existing Web-first/Cloudflare deployment model unless
Capacitor both fixes measurable gaps and offers a safe documented remote-update
strategy. This PoC deliberately does not attempt Live microphone / Bluetooth routing.

References: https://capacitorjs.com/docs/getting-started
and https://github.com/capacitor-community/text-to-speech
