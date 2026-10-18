# Crew Shorts conversation-first MVP (Web)

Scope: Crew Web only. Free/no-key trial is explicitly **out of scope** and owned by another workstream. No fictional public comments or fake human activity are added.

## P0 — short-to-conversation

- Every Shorts card offers three fixed, accessible entry questions: “Tell me more”, “How do you feel?”, and “What happened next?” with Chinese alternatives. The home preview adds a single low-friction entry question.
- Clicking an entry preserves the approved `friendId` and `postId`, and appends only a fixed `hook` enum. Friend Live verifies the post against the published feed before attaching context; arbitrary URL text is never injected into prompts.
- The existing fiction/prompt-injection and language-mode boundaries remain in place. New entry instructions must not fabricate a future chapter, leak private memory or force an interrogation.
- Product analytics records `shorts_view`, `shorts_chat_click`, `shorts_hook_click`, and `shorts_conversation` with coarse `shorts_home`/`shorts_feed` detail only. Nothing about the user's voice, chosen character, post, or prompt is sent to analytics.

## P1 — published story continuations

- Related approved posts share `friendId + storyId`; the feed displays episode number and a previous-caption recap, when both episodes are present in the loaded archive.
- After a genuine user-and-friend completed turn, local storage keeps the public `friendId`, `storyId`, `postId`, publication timestamp, and interaction timestamp. No transcripts, quotes, reactions, inferred personal facts, cross-friend sharing, or backend story-memory synchronization.
- When a *newer actually published* post from the same friend and story arc appears, the home and full feed offer a “new chapter” conversation shortcut. Never invent unseen, unpublished or AI-suggested episodes.
- Friend-memory opt-out both hides and clears continuity markers. Broken/private local storage cannot break voice chat.
- The story generator's `storyMode` allows `continue` (keep prior storyId and factual prior context) or `new` (start a dated arc). No change to the cross-platform Shorts JSON schema; Android continues to ignore optional unknown fields. Existing manually-approved posts are preserved.

## Release validation

Run `npm run check:web`, `npm test`, and `npm run build:web`. Check Chrome/mobile manually: post → chosen hook → Friend Live → completed exchange → new chapter banner (if an approved sequel exists). Also verify invalid/removed deep links fall back safely and private-memory opt-out clears the marker.

Track the conversion funnel for at least two weeks before making claims about impact:

1. `shorts_view` → `shorts_hook_click` or `shorts_chat_click` (card interest).
2. `shorts_chat_click` → `shorts_conversation` (meaningful, completed turn).
3. `shorts_story_followup` → `shorts_conversation` (published-sequel return).

The event stream can support counts; it does not by itself establish a user-level cohort or seven-day retention. Do not divide event totals and call them unique visitor conversion rates.

## Editorial rule for future Shorts

Choose a grounded moment with a reason to answer, not endless generic photo captions. Follow an established arc when the same situation changed; otherwise create a new story. Use natural humor and choices, **not** fake emergencies, guilt or emotional manipulation. Generate each character photo from approved identity references, keep the existing human review gate, and avoid reusing private user conversations as public story material.
