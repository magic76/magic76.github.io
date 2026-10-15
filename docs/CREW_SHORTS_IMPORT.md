# Crew Shorts seed import

Current publishing target: **Cloudflare Pages**, not R2. See content/crew-shorts/README.md.

Preserve the original 15 story texts, IDs and translations produced for Zoe, Bella, Hugo, Theo and Yuna in the separate conversation; the ZIP bytes and finished WebP pictures have not yet been imported. Never represent Unsplash demo pictures as originally generated photos.

Review the source; stage approved captions, translations and image files in content/crew-shorts/approved/. Run scripts/publish-shorts-pages.mjs with --dry-run and a chosen --as-of date. Once validated, use the opt-in GitHub Actions job to commit the static release into features/teacher/shorts/. Cloudflare's existing Git integration should then deploy it.

The browser reads static JSON, photos remain outside JS, and Friend Live verifies post IDs against the published feed. R2 is only an optional future scale-up.
