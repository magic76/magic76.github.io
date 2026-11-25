# Koolo AI search discovery
Canonical: https://koolo.app. Keep existing sitemap, reciprocal zh-Hant/en hreflang, public HTML and private/preview noindex unchanged.
 
## Crawler verification
- Run `node --test tests/aieo-crawl.test.mjs` and `node scripts/check-live-aieo.mjs` after deployment. The latter checks synthetic UA HTTP responses, not verified crawler identities or robots rule evaluation.
- Check the actual production robots.txt for each search agent; the current repository wildcard Allow policy already permits them. Check Cloudflare managed robots, AI Crawl Control, bot/security events and WAF for genuine Googlebot, bingbot, OAI-SearchBot and PerplexityBot access. Never bypass WAF on User-Agent alone; use verified identities/published IP guidance, limited to public GETs. Keep API/admin/auth protections.
- OAI-SearchBot is search; GPTBot is a separate training decision. Do not silently change training policy. No new llms.txt or AI-specific schema required.
- Use Google Search Console URL Inspection and Bing Webmaster Tools for real indexing. Keep evidence and date; a 200 probe is not proof of inclusion.
- Existing brand identity is Koolo / 酷囉 at koolo.app; Zoe is the AI friend, not a separate company. Cite current product policy in copy; avoid claims of unlimited free use or mandatory BYOK.

Official references:
- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- https://developers.openai.com/api/docs/bots
- https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt
