# Packfora Talent Hub — Standard Operating Procedure

Single source of truth for everyone working on the Packfora Talent Hub: end
users, business leads, system admins, and developers. The application source
lives on GitHub and runs on Render. The database, authentication, and storage
backend is Supabase.

---

## 1. What the application does

Packfora Talent Hub is an end-to-end Applicant Tracking System covering:

- Requisitions (job openings, approval flow, status tracking)
- Candidates (pipeline from Applied → Joined, with full history)
- Interviews (scheduling, feedback, outcomes)
- Offers (release, acceptance, joining)
- Bulk data import via CSV / Excel
- Executive dashboard with KPIs, charts and AI-assisted insights
- Admin control centre for master data, users, roles, audit log

---

## 2. Roles

| Role              | What they can do                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------- |
| System Admin      | Everything: master data, users, roles, audit log, Danger Zone (clear data / clear logs)  |
| Business Lead     | View dashboard, requisitions, candidates, interviews, offers; approve requisitions       |
| Recruiter         | Create/edit requisitions, candidates, interviews, offers within their assigned scope     |
| Super Admin       | Only `admin@admin.local`. Same as System Admin plus destructive actions (Danger Zone)    |

Roles live in `public.user_roles` and are checked via the `has_role()`
security-definer function. Never trust roles stored in the browser.

---

## 3. End-user guide

### 3.1 Signing in
1. Open the app URL.
2. Enter email and password, or click **Continue with Google** if your admin
   has enabled it.
3. Forgot password? Click the link on the sign-in page; you will receive a
   reset email.

### 3.2 Session timeout
For security, you are automatically signed out after **5 minutes of
inactivity**. A 30-second warning dialog appears first — click **Stay signed
in** to keep working.

### 3.3 Dashboard
- The top KPI strip shows pipeline, shortlisted, interviewed, offers, joined,
  and open requisitions, all respecting the global filters (BU, FY,
  Recruiter, Location, Source, Level).
- The **Insights** panel turns the numbers into plain-English observations
  automatically. If the AI key is configured on the server, you can also
  click **Ask AI for a deep dive** for a 4–6 sentence narrative.
- When a chart has no data, you can click **Analyse & estimate with AI** on
  that chart to get a plausible breakdown inferred from surrounding data.
  Results are clearly marked as *estimated*.

### 3.4 Requisitions
1. Go to **Requisitions** → **New requisition**.
2. Fill in BU, department, location, level, role title, justification.
3. Save as draft, then submit for approval when ready.
4. Approvers see pending items in their dashboard and approve / reject.

### 3.5 Candidates
1. **Candidates** → **Add candidate** (or use **Upload data** for bulk
   import).
2. Move a candidate through the pipeline by editing their status: Applied →
   Shortlisted → Interviewed → Offered → Joined.
3. Attach interviews and offers from the candidate detail page.

### 3.6 Interviews & Offers
- Use the dedicated **Interviews** and **Offers** pages to schedule and
  track. Each row links back to a candidate and a requisition.

### 3.7 Bulk import
1. **Upload data** → choose the entity (Requisitions, Candidates, etc.).
2. Download the template, fill it, and upload.
3. The import history table shows rows imported, rows failed, and which user
   ran the import.

---

## 4. Admin guide

### 4.1 Master data
The **Admin Control Center** has tabs for Locations, Recruiters, Business
Units, Departments, Expertise, Levels, Sources. Each tab is a simple CRUD
table with search and pagination. Every change is written to the audit log.

### 4.2 Users & roles
- **Add user** creates an auth user (password is set immediately, no email
  confirmation required) and assigns a role.
- **Edit user** lets you change name, role, or disable / enable the account.
- **Reset password** sets a new password directly — useful if the user is
  locked out.
- Only the super admin (`admin@admin.local`) can delete a user.

### 4.3 Audit log
- Every create / update / delete on master data, users, candidates,
  requisitions, interviews, and offers is logged with who did it and when.
- Use the filter box to search by action, entity, entity id, or user email.
- Super admin can delete individual entries.

### 4.4 Danger Zone (super admin only)
The **Danger Zone** tab in the Admin Control Center has two independent
actions:

1. **Clear all operational data** — permanently deletes every candidate,
   requisition, interview, offer, and import history record. Master data,
   users, roles, and audit log are preserved. You must type
   `DELETE ALL DATA` to enable the button. The clearance itself is written
   to the audit log.
2. **Clear all logs** — permanently deletes every audit log entry.
   Operational data is not touched.

Both actions are irreversible. Take a database backup first if you are not
sure.

---

## 5. AI deep-dive (optional, free)

The **Ask AI for a deep dive** button on the dashboard and the **Analyse &
estimate with AI** button on empty charts call Google Gemini's free tier
directly. They do not appear if the key is missing — the app continues to
work normally with rule-based insights only.

To enable them:

1. Get a free API key at <https://aistudio.google.com/apikey>.
2. In Render, open the service → **Environment** → add a variable named
   `GOOGLE_API_KEY` with your key as the value.
3. Click **Save changes**. Render redeploys automatically; the buttons
   appear once the new deployment is live.

To disable: delete `GOOGLE_API_KEY` from Render → Environment.

Note: the AI key is held only by the deployed application on Render. It is
not stored anywhere else. The app sends only aggregated, anonymous statistics
to Gemini — never names, emails, or other personal data.

Common errors:

| Error                  | Meaning                                       | Fix                                                          |
| ---------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| `Gemini API 403`       | Key is invalid or restricted                  | Regenerate a key in AI Studio and update Render env.        |
| `Gemini API 429`       | Free-tier quota exhausted (15 req/min, 1M/day)| Wait a minute or upgrade the Google Cloud project.          |
| `Gemini returned an empty response` | Prompt was filtered                | Rerun; if persistent, simplify the dashboard view.          |
| `Network error: …`     | Outbound network blocked                      | Check Render egress; retry.                                 |

---

## 6. Developer guide — Git and Render

Developers do not have access to any low-code or visual editor. The entire
workflow is **GitHub → Render**.

### 6.1 Tech stack
- **Frontend / SSR**: TanStack Start (React 19, Vite 7)
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript (strict)
- **Backend**: Supabase (Postgres, Auth, Storage)
- **Hosting**: Render web service (Node runtime)
- **Optional AI**: Google Gemini free tier (server-side fetch only)

### 6.2 Repository layout (high level)
```
src/
  routes/             # File-based routing (TanStack Start)
    __root.tsx        # Root layout — head, providers
    _authenticated/   # Protected routes (auth guard)
    auth.tsx          # Sign-in page
  components/         # Reusable UI
  hooks/              # React hooks (useAuth, etc.)
  lib/                # Helpers and server functions (*.functions.ts)
  integrations/
    supabase/         # client.ts (browser), client.server.ts (admin),
                      # auth-middleware.ts, types.ts  ← auto-generated, do not edit
supabase/
  migrations/         # SQL migrations (timestamped)
docs/
  PACKFORA_SOP.md     # This document
scripts/
  build_sop_docs.sh   # Regenerate the .docx version
```

### 6.3 Local development

```bash
# 1. Clone
git clone git@github.com:<org>/packfora-talent-hub.git
cd packfora-talent-hub

# 2. Install dependencies (we use bun, but npm/pnpm also work)
bun install

# 3. Copy env template and fill in values
cp .env.example .env
# Required:
#   VITE_SUPABASE_URL=...
#   VITE_SUPABASE_PUBLISHABLE_KEY=...
#   SUPABASE_URL=...
#   SUPABASE_PUBLISHABLE_KEY=...
#   SUPABASE_SERVICE_ROLE_KEY=...        (server only; admin operations)
# Optional:
#   GOOGLE_API_KEY=...                    (enables AI deep-dive)

# 4. Run the dev server
bun run dev
# → http://localhost:3000
```

### 6.4 Branching and pull requests

- Default branch: `main`. **Render auto-deploys `main`.** Never push broken
  code to `main`.
- Work on a feature branch: `git checkout -b feat/<short-name>`.
- Commit messages: `feat:`, `fix:`, `chore:`, `docs:`, etc. (Conventional
  Commits).
- Open a PR into `main`. CI must pass. At least one reviewer approves.
- Squash-merge to keep `main` history linear.

### 6.5 Update directly from Git and push to Render

Render is configured for **auto-deploy on push to `main`**. The deployment
flow is therefore just `git push`:

```bash
# On a clean main branch
git checkout main
git pull --rebase origin main

# Make changes, then:
git add .
git commit -m "feat: short description"

# Push — Render watches the repo and starts a new deploy automatically
git push origin main
```

Watch the deploy in **Render → packfora-talent-hub → Events / Logs**.
A typical deploy takes 2–4 minutes.

If auto-deploy is ever disabled, you can trigger a deploy manually in
**Render → Manual Deploy → Deploy latest commit**.

To roll back, open **Render → Deploys**, find the previous green deploy,
and click **Rollback to this deploy**.

### 6.6 Database migrations

All schema changes live in `supabase/migrations/` as timestamped SQL files.

**Rules:**
- Every `CREATE TABLE public.<x>` must be followed in the **same migration**
  by `GRANT` statements and `ALTER TABLE … ENABLE ROW LEVEL SECURITY` plus
  the policies.
- Never modify the `auth`, `storage`, `realtime`, `supabase_functions`, or
  `vault` schemas.
- Apply migrations to the production database via the Supabase SQL editor
  (preferred) or `supabase db push` if the local CLI is configured. Always
  test the migration on a staging project first.

### 6.7 Environment variables on Render

Set these under **Render → Environment**:

| Variable                       | Required | Purpose                                          |
| ------------------------------ | -------- | ------------------------------------------------ |
| `SUPABASE_URL`                 | yes      | Server-side Supabase URL                         |
| `SUPABASE_PUBLISHABLE_KEY`     | yes      | Server-side publishable key                      |
| `SUPABASE_SERVICE_ROLE_KEY`    | yes      | Server-side admin key (bypasses RLS)            |
| `VITE_SUPABASE_URL`            | yes      | Same URL, exposed to the browser bundle          |
| `VITE_SUPABASE_PUBLISHABLE_KEY`| yes      | Same publishable key, exposed to the browser    |
| `GOOGLE_API_KEY`               | no       | Enables the AI deep-dive and chart-fill buttons |

After editing variables, click **Save changes**. Render redeploys
automatically so the new values take effect.

### 6.8 Server-side code rules

- App-internal server logic uses TanStack Start server functions
  (`createServerFn` from `@tanstack/react-start`) in `*.functions.ts` files.
- External webhooks or public APIs use file-based server routes under
  `src/routes/api/public/`.
- Use `requireSupabaseAuth` middleware to scope queries to the signed-in
  user (RLS applies).
- Use the service-role admin client **only** inside server functions after
  verifying the caller has the right role (`has_role(userId, 'system_admin')`).
- Never log or return service-role keys, passwords, or tokens.

### 6.9 Idle session

The 5-minute idle auto-logout is implemented in
`src/components/IdleLogout.tsx`, mounted inside the `_authenticated` layout.
To change the timeout, edit the `IDLE_MS` constant.

### 6.10 Releasing a new version
1. Merge the PR into `main`.
2. Render auto-deploys.
3. Smoke-test the live URL: sign in, view dashboard, create a candidate,
   delete it.
4. Tag the release: `git tag v1.x.y && git push --tags`.

### 6.11 Troubleshooting

| Symptom                                | Likely cause                              | First action                                       |
| -------------------------------------- | ----------------------------------------- | -------------------------------------------------- |
| Render deploy fails on `bun run build` | TypeScript or missing dependency error    | Check the failing commit's build logs in Render    |
| Users get `Unauthorized` on a server fn| `attachSupabaseAuth` not in middleware    | Verify `src/start.ts` still registers it           |
| Dashboard is empty after import        | Wrong column mapping in the CSV template  | Re-download the template and reimport              |
| AI buttons are missing                 | `GOOGLE_API_KEY` not set or restart pending | Re-add the env var in Render and wait for redeploy |
| Account locked out                     | Auth user disabled or password forgotten  | Super admin resets password in Admin → Users       |

---

## 7. Support & contacts

- Application owner: TA Operations
- Hosting: Render (`packfora-talent-hub` service)
- Source code: GitHub (`<org>/packfora-talent-hub`)
- Database & auth: Supabase project linked in the developer `.env`

Last updated: 2026-06-18
