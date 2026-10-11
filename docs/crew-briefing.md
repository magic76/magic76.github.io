# Crew Briefing

Crew Web's public-source daily research intelligence and personal action board.

## Routes
- `/#/briefing` — latest daily reports, archive, project filter, search, bookmarks
- `/#/briefing/YYYY-MM-DD/ID` — citations, relevance, Agent Prompt, GitHub commit hints, Crew Lab SI draft
- `/#/briefing/board` — reading/research/delegation/adopted/dismissed states, export

The original Teacher session reports remain independent at `/#/teacher/reports`.
The five-item bottom navigation remains unchanged; Crew Briefing enters from the home page.

## Daily generation

Source files: `web-spa/public/briefings/index.json` and `YYYY-MM-DD.json`. These are copied to `crew-app/briefings/` by Vite.

`.github/workflows/crew-briefing-daily.yml` runs at 23:00 UTC, equivalent to **07:00 Asia/Taipei**, subject to GitHub Actions scheduling delays. Manual `workflow_dispatch` is supported.

Daily job:
1. Pulls public Hacker News items, OpenAlex scholarly index metadata, and public GitHub commits.
2. Limits sources to HTTPS and past-seven-day entries; deduplicates sources across recent editions.
3. Optionally enriches the writing with Gemini, **only if** repository secret `CREW_BRIEFING_GEMINI_KEY` is set. The job does not access browser Gemini keys.
4. Runs TypeScript check, build, and automated tests.
5. Commits the public JSON and compiled static site to `master`. If no fresh public sources are found, fails rather than writing a fake report.

**The scheduled job is separate from the chat's existing daily report schedule.** It cannot import previous ChatGPT automation output without a specifically authorized integration. Public feeds are the actual data source.

## Privacy, review and limitations

- All generated reports are **public**. Do not feed private repositories, browser history, email, personal memory, Google Calendar, or confidential documents into this pipeline.
- LLM enrichment cannot validate scientific claims on its own: all reports include primary links, an automation disclaimer, and manual verification steps.
- Personal reading states, notes, bookmarks, and social drafts live in this device's localStorage under `crew_briefing_review_v1`. These are never committed.
- Agent action generates/copies/downloads a Prompt and marks the item as delegated; it **does not** trigger real remote execution. Paste the Prompt into Crew Pocket or Crew Deck and verify results.
- GitHub progress comparison is public-repo, keyword-based matching; it is **not** completion detection.
- Crew Lab SI draft is local and requires editorial approval before posting. Nothing is auto-published to Facebook.
- Cross-device synchronization and real background push notifications require separately deployed authenticated backend (e.g. Firebase Auth + Firestore + FCM), project credentials and consent. These are not silently simulated by this static site.
- To configure AI enhancement, add `CREW_BRIEFING_GEMINI_KEY` to GitHub repository Actions secrets. No key is needed for deterministic source summaries.

## Release checklist

1. Merge this branch to master after checks pass.
2. In GitHub Actions run **Crew Briefing daily** once using **Run workflow** to publish the first real report; wait for the action result rather than assuming new data exists.
3. Confirm `https://magic76.github.io/crew-app/briefings/index.json` and `https://magic76.github.io/crew-app/#/briefing` serve the same edition.
4. Test mobile navigation, report source URLs, local bookmarks/notes, and clipboard on HTTPS.
5. If connecting Firebase later, enforce **per-user rules** and never write user-specific metadata into public JSON.
