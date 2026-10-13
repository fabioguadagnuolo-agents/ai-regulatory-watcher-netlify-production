AI Regulatory Watcher v1.9 — Netlify Drop package

1. Drop this ZIP/folder into the existing Netlify project ai-regulatory-watcher.
2. The frontend is read-only: it fetches /latest-weekly-snapshot.json only.
3. Refreshing the page does NOT call n8n, Gemini, OpenAI, Gmail, or any watcher endpoint.
4. Clerk authentication from the previous v1.8 frontend is preserved.
5. After the Netlify project rename, Clerk must be updated to allow the new site URL/domain.
6. The bundled snapshot is the latest complete official snapshot available in the project files used to build this package (8 Oct 2026, PARTIAL). Future weekly snapshots still require the authenticated n8n→Netlify publication bridge.
