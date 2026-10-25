# Crew Device Capabilities — Web / Android WebView

## Goal

React UI uses a single API in `web-spa/src/lib/deviceCapabilities.ts`;
feature pages do **not** test Android UA strings or implement their own TTS
WebView links. The existing debug Android Preview in `magic76/crew-teacher`
implements the native adapter with `androidx.webkit:webkit:1.16.0`.

## Current P0 capabilities

| Capability | Chrome/ordinary browser | Old Android WebView Preview | New Android WebView Preview |
| --- | --- | --- | --- |
| `speakText(text, {speed, voice, onError})` | `speechSynthesis` / local voice | legacy `crew-tts:` link | origin-scoped `CrewDeviceBridge.postMessage` |
| `getDeviceCapabilities().tts` | browser or unavailable | native-legacy | native-message |
| `probeNativeDeviceCapabilities()` | null | null | async native handshake |
| Photo/file picker | existing HTML `<input type=file>` | existing Android file chooser | unchanged |
| Microphone | `getUserMedia` permission | same + existing WebView grant | unchanged |

Native WebMessage is selected only if the allowed-origin **injected object**
actually exists, not from Android UA alone. Legacy `CrewNativeTts/1` remains
for compatibility with already-installed debug APKs. Browsers and third-party
WebViews never acquire native TTS APIs.

Protocol v1:
```json
{"v":1,"id":"crew_1","method":"getCapabilities"}
{"v":1,"id":"crew_2","method":"speak","params":{"text":"hello","rate":"slow"}}
```
Native replies with matching `id`, `v=1`, `ok`, and advertised capabilities.
Web correlates IDs, times out missing replies, and does **not** retry a failed
native speech request in the browser (prevents accidental duplicate playback).
The native side checks allowed HTTPS origins, active document, main frame,
message size, text length, supported rates and methods.

This API is **not** a permission manager. Device camera, microphone,
Bluetooth/live audio and keys remain managed by their existing feature paths.
A `photoPicker: "web-input"` result is a routing statement, not a granted
camera permission. Add new capability methods only with validated intent,
origin checks and device regression coverage.

## Verification

CI / JVM and Web:
```sh
npm test
npm run check:web
npm run build:web
# Android repository separately:
gradle testDebugUnitTest assembleDebug --no-daemon
```

Manual real-device gate (required before considering native release):
1. Install the new **debug** Crew Web Preview APK.
2. Open Learn → Vocabulary; tap Listen, Listen Slowly, answer a question
   (automatic word playback), change speed and tap repeatedly.
3. Check Android's installed English TTS voice, and failed/missing voice behavior.
4. In external Chrome check identical vocabulary functionality but browser voices.
5. Open photo picker/camera chooser, back/cancel and retry; verify no new
   permission grant and unchanged microphone/Web Live behavior.
6. Background/resume and navigate between Home/Learn; ensure no lost UI.
7. If possible test a WebView without WebMessageListener: old URL fallback.

Android repository includes optional
`gradle connectedDebugAndroidTest` for a **real WebView** origin-injection
smoke test. It is intentionally not part of every GitHub Actions PR build
to avoid additional emulator minutes. It has to be executed on a device or
emulator; a green JVM test is not a substitute.

## Capacitor comparison (isolated)

`experiments/capacitor-device-smoke/` contains a standalone Capacitor 8 demo
for Android TTS + photo picker. It does **not** replace Crew deployment,
change the Android release, or enable remote `server.url` loading in
production. Build separately and compare device behavior using its README.
Decide on any migration only after identifying concrete plugin and deployment
advantages versus the current origin-scoped Web-first shell.
