## What I'll do

The "Ask AI for a deep dive" feature is already built in your codebase (`src/lib/ai-insights.functions.ts`, `src/components/dashboard/InsightsPanel.tsx`). It just needs documentation and a build sanity check.

### 1. Update `docs/DEPLOYMENT_SOP.md`
Add a new section **"Enable AI deep-dive insights (optional, free)"** with:
- What it does and why it's free (Gemini 2.5 Flash free tier: 15 req/min, 1M tokens/day, no Lovable credits used)
- Step-by-step:
  1. Visit https://aistudio.google.com/apikey and click "Create API key"
  2. Copy the key
  3. In Render → your service → Environment → Add `GOOGLE_API_KEY` = pasted key → Save (auto-redeploys)
  4. Open Dashboard → the "Ask AI for a deep dive" button appears
- How to disable: delete the env var; button hides automatically
- Troubleshooting: 429 (rate limit), 403 (bad key), empty response

### 2. Update `docs/USER_GUIDE.md`
Add a short user-facing **"Insights panel"** section under Dashboard:
- Rule-based bullets always show (pipeline health, stale reqs, conversion, etc.)
- "Ask AI for a deep dive" button (when enabled by admin) returns a 4–6 sentence narrative
- Note: no personal names are sent to the AI

### 3. Regenerate the Word `.docx` versions
Re-run `scripts/build_sop_docs.sh` (or equivalent) so the downloadable `.docx` files in `/mnt/documents/` reflect the new content. Surface them as artifacts.

### 4. Verify build
Run a quick TypeScript/build sanity check on the existing insights code to confirm nothing is broken before you redeploy.

### What I will NOT do
- Won't modify the insights engine or AI function — they're already correct.
- Won't add the `GOOGLE_API_KEY` secret to Lovable Cloud (it lives in Render, not here).
