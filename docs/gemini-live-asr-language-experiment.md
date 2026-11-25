# Gemini Live input-transcription language hints (opt-in)

Normal sessions are unchanged. To test the existing Live socket with native/learning
language hints, open `/friend/live?id=zoe&asrHints=1` (or the existing teacher
route with `asrHints=1`). For Traditional Chinese + English, the client sends
`inputAudioTranscription: {languageCodes:["zh-TW","en-US"]}` to gemini-3.8-live.
All three Friend modes use the same pair. Unknown selections are omitted; identical
languages are deduplicated. Legacy models, pure text-only sessions without mic
upgrade, and ordinary links are unchanged. Browser STT remains optional and off.

Compare the same short Mandarin, English and code-switched sentences in normal and
opt-in sessions. Verify BYOK voice (existing v1alpha), guest/member voice (existing
constrained v1beta), text-to-voice upgrade, mute, second call, Bluetooth route,
and captions. Console `[CrewLive ASR hints]` indicates setup accepted and lists
the supplied locales; it does not prove recognition honors the hints.

The public reference https://ai.google.dev/api/live documents languageCodes as
hints, not a strict language lock; actual behavior of both deployed endpoints
and model must be verified. If setup fails, remove the URL flag and begin a fresh
call. A guest token can be single-use: do not automatically reconnect with it or
request another quota. No new STT service, model, microphone, token issuance,
or API version change. Do not globally enable before both routes are validated.
