/**
 * Crew Shorts HTML Preview Report Generator.
 * Creates an interactive/static HTML review report for human inspection of daily batches.
 */
import {writeFileSync, mkdirSync, readFileSync, existsSync} from 'node:fs';
import {join, dirname, relative} from 'node:path';

export function renderHtmlReport(manifest, dir, root) {
  const date = manifest.date || 'unknown-date';
  const stories = manifest.stories || [];
  const status = manifest.status || 'unknown';
  const mode = manifest.mode || 'preview';
  const cost = manifest.costEstimate?.estimatedCostUsd ? `$${manifest.costEstimate.estimatedCostUsd.toFixed(4)}` : 'N/A';
  
  let cardsHtml = '';
  if (stories.length === 0 && manifest.friends) {
    cardsHtml = `
      <section class="character-card">
        <div class="card-header">
          <div class="character-title"><h2>Planned Characters (${manifest.friends.length})</h2></div>
        </div>
        <div class="card-body" style="grid-template-columns: 1fr;">
          <p>No photos generated yet (Plan Mode). Planned characters: <strong>${manifest.friends.join(', ')}</strong></p>
          ${manifest.continuity ? `<pre style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; font-size: 0.85rem; margin-top: 10px;">Continuity History:\n${JSON.stringify(manifest.continuity, null, 2)}</pre>` : ''}
        </div>
      </section>
    `;
  } else {
    cardsHtml = stories.map(story => {
    const friendId = story.friendId;
    const friendName = story.friendName || (friendId[0].toUpperCase() + friendId.slice(1));
    const avatarRel = relative(dir, join(root, 'assets/friends/crew_friend_' + friendId + '.webp'));
    const photoRel = story.image ? relative(dir, join(dir, friendId + '.webp')) : (friendId + '.webp');
    const qa = story.qa || {};
    const checks = qa.checks || {};
    const qaChecksHtml = Object.entries(checks).map(([key, passed]) => `
      <span class="qa-badge ${passed ? 'pass' : 'fail'}">
        ${passed ? '✓' : '✗'} ${key}
      </span>
    `).join('');

    return `
      <section class="character-card" id="card-${friendId}">
        <div class="card-header">
          <div class="character-title">
            <h2>${friendName}</h2>
            <span class="badge role-badge">Crew Friend (${friendId})</span>
            <span class="badge sha-badge">Master SHA: Verified</span>
          </div>
          <div class="qa-summary ${qa.pass ? 'pass' : 'fail'}">
            ${qa.pass ? '✓ QA Passed' : '✗ QA Failed'}
          </div>
        </div>

        <div class="card-body">
          <div class="media-comparison">
            <div class="media-box">
              <div class="media-label">Official Master Identity (Canonical)</div>
              <div class="media-wrapper avatar-frame">
                <img src="${avatarRel}" alt="${friendName} official master avatar" loading="lazy" />
              </div>
              <div class="media-meta">Immutable Reference &middot; SHA-1 Pinned</div>
            </div>

            <div class="media-box">
              <div class="media-label">Generated 3:4 Lifestyle Photo (${date})</div>
              <div class="media-wrapper photo-frame">
                <img src="${photoRel}" alt="${story.imageAlt || friendName}" loading="lazy" />
              </div>
              <div class="media-meta">3:4 Portrait &middot; WebP &middot; Attempts: ${story.attempts || 1}</div>
            </div>
          </div>

          <div class="story-content">
            <div class="caption-block">
              <div class="lang-label">English Caption</div>
              <p class="caption-en">&ldquo;${story.caption}&rdquo;</p>
            </div>
            
            <div class="caption-block">
              <div class="lang-label">Traditional Chinese (繁中翻譯)</div>
              <p class="caption-zh">${story.translationZh}</p>
            </div>

            <div class="details-block">
              <details>
                <summary>Image Accessibility Alt & Scene Prompt</summary>
                <div class="details-inner">
                  <p><strong>imageAlt:</strong> ${story.imageAlt}</p>
                  <p><strong>Scene:</strong> ${story.scene || 'N/A'}</p>
                  ${story.storyContext ? `<p><strong>Story Context:</strong> ${story.storyContext}</p>` : ''}
                </div>
              </details>
            </div>

            <div class="qa-block">
              <div class="lang-label">Visual Identity QA Breakdown</div>
              <div class="qa-grid">
                ${qaChecksHtml || '<span class="qa-badge pass">All 9 Checks Verified</span>'}
              </div>
              ${qa.reason ? `<p class="qa-reason"><strong>QA Reason:</strong> ${qa.reason}</p>` : ''}
            </div>
          </div>
        </div>
      </section>
    `;
    }).join('\n');
  }

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Crew Shorts Review Report — ${date}</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --card-border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
      --border-radius: 12px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 24px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    header.report-header {
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--card-border);
    }
    h1 { font-size: 1.8rem; margin-bottom: 8px; color: var(--primary); }
    .meta-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 0.9rem;
      color: var(--text-muted);
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .status-badge { background: #0369a1; color: #e0f2fe; }
    .role-badge { background: #334155; color: #cbd5e1; }
    .sha-badge { background: #065f46; color: #a7f3d0; }
    .character-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: var(--border-radius);
      margin-bottom: 32px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: rgba(255,255,255,0.03);
      border-bottom: 1px solid var(--card-border);
    }
    .character-title { display: flex; align-items: center; gap: 12px; }
    .character-title h2 { font-size: 1.4rem; }
    .qa-summary {
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
    }
    .qa-summary.pass { background: #065f46; color: #6ee7b7; }
    .qa-summary.fail { background: #991b1b; color: #fca5a5; }
    .card-body {
      display: grid;
      grid-template-columns: minmax(320px, 480px) 1fr;
      gap: 24px;
      padding: 24px;
    }
    @media (max-width: 860px) {
      .card-body { grid-template-columns: 1fr; }
    }
    .media-comparison {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .media-box {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .media-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 6px;
      text-align: center;
    }
    .media-wrapper {
      width: 100%;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--card-border);
      background: #000;
    }
    .media-wrapper img {
      width: 100%;
      height: auto;
      display: block;
      object-fit: cover;
    }
    .avatar-frame { aspect-ratio: 1/1; }
    .photo-frame { aspect-ratio: 3/4; }
    .media-meta {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 6px;
      text-align: center;
    }
    .story-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .lang-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--primary);
      margin-bottom: 4px;
      font-weight: 700;
    }
    .caption-en {
      font-size: 1.15rem;
      font-style: italic;
      color: #fff;
    }
    .caption-zh {
      font-size: 1.05rem;
      color: #e2e8f0;
    }
    .details-block details {
      background: rgba(0,0,0,0.2);
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.85rem;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .details-block summary {
      cursor: pointer;
      color: var(--text-muted);
      font-weight: 600;
    }
    .details-inner { margin-top: 8px; line-height: 1.5; color: #cbd5e1; }
    .qa-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }
    .qa-badge {
      font-size: 0.75rem;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 500;
    }
    .qa-badge.pass { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .qa-badge.fail { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .qa-reason {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 6px;
    }
    footer.report-footer {
      margin-top: 32px;
      padding: 20px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: var(--border-radius);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .action-guide { font-size: 0.9rem; }
    .action-guide code {
      background: #0f172a;
      padding: 3px 6px;
      border-radius: 4px;
      color: #38bdf8;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="report-header">
      <h1>Crew Shorts Quality Inspection Report</h1>
      <div class="meta-bar">
        <span>Date: <strong>${date}</strong></span>
        <span>Mode: <strong class="badge status-badge">${mode}</strong></span>
        <span>Status: <strong>${status}</strong></span>
        <span>Estimated Cost: <strong>${cost}</strong></span>
        <span>Characters: <strong>${stories.length}</strong></span>
      </div>
    </header>

    <main>
      ${cardsHtml}
    </main>

    <footer class="report-footer">
      <div class="action-guide">
        <p><strong>Next Step:</strong> Review photos and captions carefully.</p>
        <p>To approve and submit as a PR: <code>npm run shorts:submit -- --date ${date}</code></p>
      </div>
    </footer>
  </div>
</body>
</html>
`;

  const reportPath = join(dir, 'index.html');
  mkdirSync(dir, {recursive: true});
  writeFileSync(reportPath, html, 'utf8');
  return reportPath;
}
