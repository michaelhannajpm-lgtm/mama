# Admin Mom-Profile Detail Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Click any row in the `/admin` → "Mom profiles" table to open a full-detail modal with three admin flag toggles (`verified`, `visible`, `blocked_global`), backed by a new whitelisted PATCH endpoint.

**Architecture:** All UI lives inside the existing `src/AdminPage.jsx` (matches the file's "everything in one place" convention — `MomProfilesTab`, `MomsTable`, etc. already coexist there). State flow: `AdminPage` owns `momProfiles` + `places`; `MomProfilesTab` owns the new `selectedMom` local state and renders `<MomProfileDetailModal>` when set; the modal does optimistic flag flips against `POST /api/admin/mom-profiles/update`, rolling back on failure.

**Tech Stack:** React 18 (function components, hooks only — no Context, no reducer, no store), Tailwind utility classes mixed with inline `style={...}` for tokens, Lucide icons, Vercel serverless function (Node 18+) talking to Supabase via REST + service-role key.

---

## Reference: spec & key files

- Spec: `docs/superpowers/specs/2026-05-07-admin-mom-profile-detail-design.md`
- Schema: `supabase/mom_profiles_schema.sql:3-46` — full column list
- Admin page: `src/AdminPage.jsx` (974 lines)
- Tab to modify: `MomProfilesTab` at `src/AdminPage.jsx:547-669`
- Root data loader: `AdminPage.load()` at `src/AdminPage.jsx:857-873`
- Existing admin endpoints: `api/admin/onboarding.js`, `api/admin/mom-profiles.js`, `api/admin/places.js`, `api/admin/waitlist.js`, `api/admin/reset.js` (all GET-only except reset)
- Closest patch precedent: `api/mom-profiles/update.js` (auth-token-gated; we strip the auth check for admin)
- Shared helpers: `api/_lib/supabase.js` — `json`, `readJsonBody`, `supabaseCreds`, `sbHeaders`, `isUuid`
- Design tokens: `src/theme.js` (named export `C`), reference `.claude/context/design-tokens.md`
- Animations: `src/index.css` — keyframes `slideUp`, `fadeIn`, `fadeInUp`, `popBadge` are pre-defined globally

---

## Notes on testing & local dev

The repo has **no automated test framework** (per `.claude/context/overview.md`). Each task ends with manual verification steps and a commit.

API routes do **not** run under `npm run dev` — Vite serves the `.js` source verbatim. To exercise endpoints locally use `vercel dev` (slower but matches prod) or deploy a preview to Vercel and test against the deployed URL. The `fetchEndpoint` helper at `src/AdminPage.jsx:827-855` already detects and surfaces this case.

For all manual UI verification: visit `/#admin` (or `/admin` on Vercel) → "Mom profiles" tab.

---

## Task 1: Add `POST /api/admin/mom-profiles/update`

**Files:**
- Create: `api/admin/mom-profiles/update.js`

This adds a new file in a new subdirectory. The existing `api/admin/mom-profiles.js` (file) and `api/admin/mom-profiles/update.js` (folder route) coexist on Vercel — they map to `/api/admin/mom-profiles` and `/api/admin/mom-profiles/update` respectively. Confirmed safe by the existing `api/onboarding/*` pattern.

- [ ] **Step 1: Verify the parent directories exist**

Run: `ls api/admin/`
Expected: file listing including `mom-profiles.js`, `onboarding.js`, etc.

Run: `ls api/admin/mom-profiles 2>/dev/null || echo "missing"`
Expected: `missing` (the directory doesn't exist yet — `mkdir` happens implicitly when we create the file).

- [ ] **Step 2: Create `api/admin/mom-profiles/update.js`**

```js
// POST /api/admin/mom-profiles/update — admin-only flag toggles.
// SECURITY: NO authentication. Add auth before exposing publicly.
//
// Body: { id: uuid, patch: { verified?: boolean, visible?: boolean, blocked_global?: boolean } }
// Whitelists those three boolean flags only — any other key is rejected 400
// so this endpoint can't double as a generic profile-edit gateway.
import { json, readJsonBody, supabaseCreds, sbHeaders, isUuid } from '../../_lib/supabase.js';

const ALLOWED_FLAGS = new Set(['verified', 'visible', 'blocked_global']);

const sanitizePatch = (patch) => {
  if (!patch || typeof patch !== 'object') return { error: 'patch object required' };
  const entries = Object.entries(patch);
  if (entries.length === 0) return { error: 'patch must include at least one field' };
  const out = {};
  for (const [k, v] of entries) {
    if (!ALLOWED_FLAGS.has(k)) return { error: `unknown patch field: ${k}` };
    if (typeof v !== 'boolean') return { error: `${k} must be a boolean` };
    out[k] = v;
  }
  return { patch: out };
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });

  const id = typeof body.id === 'string' ? body.id : '';
  if (!isUuid(id)) return json(res, 400, { error: 'id must be a uuid' });

  const result = sanitizePatch(body.patch);
  if (result.error) return json(res, 400, { error: result.error });

  try {
    const url = `${creds.supabaseUrl}/rest/v1/mom_profiles?id=eq.${id}`;
    const r = await fetch(url, {
      method: 'PATCH',
      headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=representation' }),
      body: JSON.stringify(result.patch),
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
    }
    const rows = await r.json().catch(() => []);
    if (!rows.length) return json(res, 404, { error: 'No mom_profile with that id' });
    return json(res, 200, { ok: true, row: rows[0] });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Network error' });
  }
}
```

- [ ] **Step 3: Sanity-check the import path**

The file is at `api/admin/mom-profiles/update.js`. The shared helper is at `api/_lib/supabase.js`. Relative path is `../../_lib/supabase.js` (two levels up: `mom-profiles/` → `admin/` → `api/`).

Run: `node -e "import('./api/admin/mom-profiles/update.js').then(() => console.log('OK')).catch(e => console.error('FAIL', e.message))"`
Expected: `OK` (the module loads — note: it imports `crypto` indirectly via `supabase.js` so plain Node 18+ is fine).

If the import resolves but throws "supabase env not configured" when invoked, that's expected and not a failure of this step.

- [ ] **Step 4: Test the endpoint with `vercel dev` + curl**

This step is optional if `vercel dev` isn't set up locally. If skipping, deploy a preview and run the curl against the preview URL instead.

Open a second terminal:
```bash
vercel dev
```

In the original terminal, find one mom-profile UUID:
```bash
curl -s http://localhost:3000/api/admin/mom-profiles | node -e "process.stdin.on('data', d => { const j = JSON.parse(d); console.log(j.rows?.[0]?.id, j.rows?.[0]?.verified) })"
```
Expected: a UUID + `true` or `false`.

Toggle that mom's `verified` flag (replace `<UUID>` and `<NEW_BOOL>`):
```bash
curl -s -X POST http://localhost:3000/api/admin/mom-profiles/update \
  -H 'Content-Type: application/json' \
  -d '{"id":"<UUID>","patch":{"verified":<NEW_BOOL>}}' | node -e "process.stdin.on('data', d => console.log(JSON.parse(d)))"
```
Expected: `{ ok: true, row: { …, verified: <NEW_BOOL>, … } }`.

Verify the 400 path:
```bash
curl -s -X POST http://localhost:3000/api/admin/mom-profiles/update \
  -H 'Content-Type: application/json' -d '{"id":"<UUID>","patch":{"display_name":"Hax0r"}}'
```
Expected: `{"error":"unknown patch field: display_name"}`.

Verify the 404 path with a syntactically-valid but nonexistent UUID:
```bash
curl -s -X POST http://localhost:3000/api/admin/mom-profiles/update \
  -H 'Content-Type: application/json' \
  -d '{"id":"00000000-0000-4000-8000-000000000000","patch":{"verified":true}}'
```
Expected: `{"error":"No mom_profile with that id"}`.

Toggle the mom back to her original `verified` value to leave state unchanged.

- [ ] **Step 5: Commit**

```bash
git add api/admin/mom-profiles/update.js
git commit -m "feat(api): admin mom-profiles update endpoint with flag whitelist"
```

---

## Task 2: Fetch `places` in `AdminPage.load()` and pass it down

The modal needs to resolve `mom.places[]` UUIDs to readable names. `/api/admin/places` already exists; we just add it to the existing `Promise.all` and thread the data through.

**Files:**
- Modify: `src/AdminPage.jsx:815-873` (root `AdminPage` component — state + loader)
- Modify: `src/AdminPage.jsx:962-967` (tab routing — pass `places` to `MomProfilesTab`)
- Modify: `src/AdminPage.jsx:547` (`MomProfilesTab` signature — accept `places`)

- [ ] **Step 1: Add `places` state to `AdminPage`**

Find the `useState` block at `src/AdminPage.jsx:817-821`:

```jsx
  const [tab, setTab] = useState('overview');
  const [moms, setMoms] = useState(null);
  const [waitlist, setWaitlist] = useState(null);
  const [momProfiles, setMomProfiles] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
```

Replace with (adds one new state line):

```jsx
  const [tab, setTab] = useState('overview');
  const [moms, setMoms] = useState(null);
  const [waitlist, setWaitlist] = useState(null);
  const [momProfiles, setMomProfiles] = useState(null);
  const [places, setPlaces] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
```

- [ ] **Step 2: Add the fetch + setter in `load()`**

Find the `Promise.all` in `load()` at `src/AdminPage.jsx:860-867`:

```jsx
      const [a, b, c] = await Promise.all([
        fetchEndpoint('/api/admin/onboarding',   'Onboarding'),
        fetchEndpoint('/api/admin/waitlist',     'Waitlist'),
        fetchEndpoint('/api/admin/mom-profiles', 'Mom profiles'),
      ]);
      setMoms(a.rows || []);
      setWaitlist(b.rows || []);
      setMomProfiles(c.rows || []);
```

Replace with:

```jsx
      const [a, b, c, d] = await Promise.all([
        fetchEndpoint('/api/admin/onboarding',   'Onboarding'),
        fetchEndpoint('/api/admin/waitlist',     'Waitlist'),
        fetchEndpoint('/api/admin/mom-profiles', 'Mom profiles'),
        fetchEndpoint('/api/admin/places',       'Places'),
      ]);
      setMoms(a.rows || []);
      setWaitlist(b.rows || []);
      setMomProfiles(c.rows || []);
      setPlaces(d.rows || []);
```

- [ ] **Step 3: Pass `places` to `MomProfilesTab`**

Find the tab routing at `src/AdminPage.jsx:962-967`:

```jsx
            {tab === 'overview'     && <Overview moms={moms} waitlist={waitlist}/>}
            {tab === 'onboarding'   && <MomsReport rows={moms} momProfiles={momProfiles}/>}
            {tab === 'mom-profiles' && <MomProfilesTab rows={momProfiles}/>}
            {tab === 'waitlist'     && <WaitlistTable rows={waitlist}/>}
            {tab === 'actions'      && <QuickActions onReset={load} momsCount={moms.length} waitlistCount={waitlist.length}/>}
```

Replace with (note the new `places` and `onPatch` props on `MomProfilesTab` — `onPatch` is wired in Task 6, but adding the prop now keeps the signature stable):

```jsx
            {tab === 'overview'     && <Overview moms={moms} waitlist={waitlist}/>}
            {tab === 'onboarding'   && <MomsReport rows={moms} momProfiles={momProfiles}/>}
            {tab === 'mom-profiles' && <MomProfilesTab rows={momProfiles} places={places || []} onPatch={(updated) => setMomProfiles(prev => prev.map(r => r.id === updated.id ? updated : r))}/>}
            {tab === 'waitlist'     && <WaitlistTable rows={waitlist}/>}
            {tab === 'actions'      && <QuickActions onReset={load} momsCount={moms.length} waitlistCount={waitlist.length}/>}
```

- [ ] **Step 4: Update the loading-guard to wait for `places` too**

Find the empty-state guard at `src/AdminPage.jsx:953`:

```jsx
        {!moms || !waitlist || !momProfiles ? (
```

Replace with:

```jsx
        {!moms || !waitlist || !momProfiles || !places ? (
```

- [ ] **Step 5: Update `MomProfilesTab`'s signature**

Find at `src/AdminPage.jsx:547`:

```jsx
const MomProfilesTab = ({ rows }) => {
```

Replace with:

```jsx
const MomProfilesTab = ({ rows, places, onPatch }) => {
  const placesById = useMemo(
    () => new Map((places || []).map(p => [p.id, p])),
    [places]
  );
```

(`useMemo` is already imported at `src/AdminPage.jsx:1`. The map is unused this task — Tasks 5/6 consume it. The unused-var warning is fine; ESLint isn't strict in this repo.)

- [ ] **Step 6: Manual verify**

Run: `npm run dev`
Visit: `http://localhost:5173/#admin` → "Mom profiles" tab.

Open DevTools → Network tab. On page load you should see four `/api/admin/*` calls (onboarding, waitlist, mom-profiles, places). Note: under `npm run dev` they all return the source file with the in-app "API routes don't run under npm run dev" message. That's still fine for verifying the call was *made*.

For real data, deploy preview or use `vercel dev`.

Console should be free of new errors. The Mom-profiles table renders unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/AdminPage.jsx
git commit -m "feat(admin): fetch places, prepare MomProfilesTab for detail modal"
```

---

## Task 3: Add `selectedMom` state, row click handler, modal scaffold

Adds the click affordance on each table row, the modal's outer shell (backdrop + panel + close handlers), but no body content yet. Body and footer are filled in Tasks 4–6.

**Files:**
- Modify: `src/AdminPage.jsx:547-669` — `MomProfilesTab` (state + row click)
- Modify: `src/AdminPage.jsx` — append a new `MomProfileDetailModal` component before `MomProfilesTab` (or after — doesn't matter; it's all module-scope)

- [ ] **Step 1: Add the `selectedMom` state to `MomProfilesTab`**

In `MomProfilesTab` (right after the `placesById` useMemo from Task 2), add:

```jsx
  const [selectedMom, setSelectedMom] = useState(null);
```

(`useState` is already imported.)

- [ ] **Step 2: Make rows clickable**

Find the `<tr>` at `src/AdminPage.jsx:627`:

```jsx
              {filtered.slice(0, 500).map(r => (
                <tr key={r.id} style={{ borderTop: `1px solid ${C.divider}` }}>
```

Replace with:

```jsx
              {filtered.slice(0, 500).map(r => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedMom(r)}
                  className="cursor-pointer transition-colors hover:bg-[var(--mp-row-hover)]"
                  style={{ borderTop: `1px solid ${C.divider}`, ['--mp-row-hover']: C.creamSoft }}
                  aria-label={`Open profile for ${r.display_name || r.username || 'mom'}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') setSelectedMom(r); }}
                >
```

(The CSS variable trick avoids hardcoding a hex — Tailwind's `hover:bg-[…]` arbitrary class can reference a CSS custom property.)

- [ ] **Step 3: Render the modal at the bottom of `MomProfilesTab`'s return**

Find the closing `</div>` and the `);` at `src/AdminPage.jsx:667-668` (end of the component's JSX, just before the closing `};`):

```jsx
      </Card>
    </div>
  );
};
```

Replace with:

```jsx
      </Card>

      {selectedMom && (
        <MomProfileDetailModal
          mom={selectedMom}
          placesById={placesById}
          onClose={() => setSelectedMom(null)}
          onPatched={(updated) => {
            setSelectedMom(updated);
            onPatch?.(updated);
          }}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 4: Add the `MomProfileDetailModal` scaffold**

Insert a new component definition just **above** `const MomProfilesTab = …` at `src/AdminPage.jsx:547`. The scaffold has the backdrop, panel, escape handler, and a placeholder header — everything else is filled in Tasks 4–6.

```jsx
// Detail modal for a single mom_profiles row. Read-only view of every field
// plus three flag toggles in the footer (Tasks 5–6).
const MomProfileDetailModal = ({ mom, placesById, onClose, onPatched }) => {
  // Esc closes the modal. Scoped via useEffect so we don't leak listeners.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(42,30,34,0.55)', animation: 'fadeIn 0.15s ease-out' }}
      role="dialog"
      aria-modal="true"
      aria-label={`Profile detail for ${mom.display_name || 'mom'}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: C.paper,
          border: `1px solid ${C.divider}`,
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          animation: 'slideUp 0.2s ease-out',
        }}
      >
        {/* Sticky header — full content lands in Task 4 */}
        <div className="px-5 py-4 flex items-start gap-3" style={{ borderBottom: `1px solid ${C.divider}`, background: C.cream }}>
          <div className="flex-1 min-w-0">
            <div style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: C.ink, letterSpacing: '-.02em', lineHeight: 1.1 }}>
              {mom.display_name || '—'}
            </div>
            <div className="mt-0.5 text-[12px]" style={{ fontFamily: 'Albert Sans', color: C.inkSoft }}>
              @{mom.username || '—'}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close profile"
            className="rounded-full p-1.5 transition-colors"
            style={{ background: 'transparent', color: C.inkSoft, border: `1px solid ${C.divider}` }}
          >
            <X size={16}/>
          </button>
        </div>

        {/* Body — Task 5 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="text-[12px]" style={{ fontFamily: 'Albert Sans', color: C.inkMuted }}>
            (body — Task 5)
          </div>
        </div>

        {/* Footer — Task 6 */}
        <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: `1px solid ${C.divider}`, background: C.cream }}>
          <div className="text-[12px]" style={{ fontFamily: 'Albert Sans', color: C.inkMuted }}>
            (footer — Task 6)
          </div>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 5: Add `X` to the lucide-react import**

The imports at `src/AdminPage.jsx:2-5`:

```jsx
import {
  BarChart3, Users, ListChecks, RefreshCw, Download, AlertTriangle, ShieldOff,
  Monitor, Smartphone, Zap, Trash2, ShieldAlert, Check as CheckIcon,
} from 'lucide-react';
```

Add `X`:

```jsx
import {
  BarChart3, Users, ListChecks, RefreshCw, Download, AlertTriangle, ShieldOff,
  Monitor, Smartphone, Zap, Trash2, ShieldAlert, Check as CheckIcon, X,
} from 'lucide-react';
```

- [ ] **Step 6: Manual verify**

Run: `npm run dev` (if not running).
Visit: `http://localhost:5173/#admin` → "Mom profiles" tab.

Click any row in the moms table:
- ✅ Modal appears centered with cream backdrop dimming the page.
- ✅ Header shows the display_name in Fraunces, @username below.
- ✅ Body shows "(body — Task 5)" placeholder.
- ✅ Footer shows "(footer — Task 6)" placeholder.

Close behaviors:
- ✅ Click the X → modal closes.
- ✅ Click the backdrop (dimmed area outside the panel) → modal closes.
- ✅ Press Esc → modal closes.
- ✅ Click *inside* the panel (e.g., on the display name) → modal does NOT close.

Hover over a row:
- ✅ Cursor becomes a pointer.
- ✅ Background lightens slightly (creamSoft).

Console should be free of new errors. (If you see "no rows" because there's no real data under `npm run dev`, deploy a preview or use `vercel dev`.)

- [ ] **Step 7: Commit**

```bash
git add src/AdminPage.jsx
git commit -m "feat(admin): clickable rows + modal scaffold for mom-profile detail"
```

---

## Task 4: Modal header — avatar, verified badge, location chips, source pill

Replaces the placeholder header from Task 3 with the full design.

**Files:**
- Modify: the `MomProfileDetailModal` header block added in Task 3.

- [ ] **Step 1: Add a small `Avatar` helper inside the modal component**

Just above `return (` inside `MomProfileDetailModal`, add:

```jsx
  const photo0 = Array.isArray(mom.photos) && mom.photos[0];
  const initial = (mom.display_name || mom.username || '?').trim().charAt(0).toUpperCase();
  const sourcePill = (() => {
    const isSeed = mom.source === 'seed';
    return {
      bg: isSeed ? `${C.saffron}25` : `${C.sageDark}20`,
      color: isSeed ? C.ink : C.sageDark,
      label: mom.source || 'unknown',
    };
  })();
```

- [ ] **Step 2: Replace the placeholder header**

Find the header block from Task 3 (the `<div className="px-5 py-4 flex items-start gap-3" …>` wrapper):

```jsx
        {/* Sticky header — full content lands in Task 4 */}
        <div className="px-5 py-4 flex items-start gap-3" style={{ borderBottom: `1px solid ${C.divider}`, background: C.cream }}>
          <div className="flex-1 min-w-0">
            <div style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: C.ink, letterSpacing: '-.02em', lineHeight: 1.1 }}>
              {mom.display_name || '—'}
            </div>
            <div className="mt-0.5 text-[12px]" style={{ fontFamily: 'Albert Sans', color: C.inkSoft }}>
              @{mom.username || '—'}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close profile"
            className="rounded-full p-1.5 transition-colors"
            style={{ background: 'transparent', color: C.inkSoft, border: `1px solid ${C.divider}` }}
          >
            <X size={16}/>
          </button>
        </div>
```

Replace with:

```jsx
        {/* Sticky header */}
        <div className="px-5 py-4 flex items-start gap-3" style={{ borderBottom: `1px solid ${C.divider}`, background: C.cream }}>
          {photo0 ? (
            <img
              src={photo0}
              alt=""
              className="rounded-full"
              style={{ width: 44, height: 44, objectFit: 'cover', border: `1px solid ${C.divider}`, flexShrink: 0 }}
            />
          ) : (
            <div
              className="rounded-full flex items-center justify-center"
              style={{ width: 44, height: 44, background: C.ink, color: C.saffron, fontFamily: 'Fraunces', fontSize: 20, fontWeight: 600, flexShrink: 0 }}
            >
              {initial}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <div style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: C.ink, letterSpacing: '-.02em', lineHeight: 1.1 }}>
                {mom.display_name || '—'}
              </div>
              {mom.verified && (
                <span title="Verified" style={{ color: C.sageDark, fontSize: 14, fontWeight: 700 }}>✓</span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 flex-wrap text-[12px]" style={{ fontFamily: 'Albert Sans', color: C.inkSoft }}>
              <span>@{mom.username || '—'}</span>
              <span style={{ color: C.inkMuted }}>·</span>
              <span>{mom.city || '—'}{mom.neighborhood ? ` · ${mom.neighborhood}` : ''}</span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px]"
                style={{
                  background: sourcePill.bg, color: sourcePill.color,
                  fontFamily: 'Albert Sans', fontWeight: 700, letterSpacing: '.04em',
                }}
              >
                {sourcePill.label}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close profile"
            className="rounded-full p-1.5 transition-colors"
            style={{ background: 'transparent', color: C.inkSoft, border: `1px solid ${C.divider}` }}
          >
            <X size={16}/>
          </button>
        </div>
```

- [ ] **Step 3: Manual verify**

Reload the admin page (or hot-reload should kick in).

Click a row whose `display_name` is set, has `verified: true`, has a `photos[0]`, has a `neighborhood`:
- ✅ The header shows the photo as a circular avatar.
- ✅ The display name is followed by a sage `✓`.
- ✅ Below the name: `@username · City · Neighborhood [source pill]`.

Click a row with no photos and `verified: false`:
- ✅ Avatar shows the first letter of display_name on an ink background, saffron text.
- ✅ No `✓` after the name.

Click a row from a seeded mom (`source: 'seed'`):
- ✅ The source pill uses the saffron-tinted background.

Click a row from a real onboarded mom (`source: 'onboarding'`):
- ✅ The source pill uses the sage-tinted background.

- [ ] **Step 4: Commit**

```bash
git add src/AdminPage.jsx
git commit -m "feat(admin): mom-profile modal header — avatar, verified, source pill"
```

---

## Task 5: Modal body — every field section

Replaces the placeholder body from Task 3 with the seven content sections (Photos, Bio, Identity, Family, Preferences, Geo, Flags, Social, Audit). All sections render — fields with no value show a muted "—".

**Files:**
- Modify: the `MomProfileDetailModal` body block.

- [ ] **Step 1: Add formatting helpers near the top of the modal component**

Inside `MomProfileDetailModal`, just below the `sourcePill` declaration from Task 4, add:

```jsx
  const fmtKidsAges = (jsonb) => {
    if (!jsonb || typeof jsonb !== 'object') return null;
    const parts = Object.entries(jsonb).map(([age, n]) => `${n}× ${age}`);
    return parts.length ? parts.join(', ') : null;
  };

  const fmtRelative = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    const ms = Date.now() - d.getTime();
    const m = Math.floor(ms / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const fmtAbsolute = (iso) => iso ? new Date(iso).toLocaleString() : null;

  const placeName = (uuid) => {
    const p = placesById?.get(uuid);
    if (p?.name) return p.name;
    return uuid?.slice(0, 8) ?? '—';
  };
```

(`fmtRelative` mirrors the page-level `rel` helper at `src/AdminPage.jsx:16-28` — duplication is intentional so the modal is self-contained.)

- [ ] **Step 2: Add three small in-modal section primitives**

Just below the helpers from Step 1, add:

```jsx
  const Section = ({ title, children }) => (
    <div className="py-3" style={{ borderBottom: `1px solid ${C.divider}` }}>
      <div className="text-[10.5px] tracking-[.16em] uppercase mb-1.5" style={{ color: C.inkSoft, fontFamily: 'Albert Sans', fontWeight: 700 }}>
        {title}
      </div>
      {children}
    </div>
  );

  const KV = ({ label, value, mono = false }) => (
    <div className="flex items-baseline gap-3 py-0.5">
      <div className="text-[11.5px]" style={{ fontFamily: 'Albert Sans', color: C.inkMuted, width: 110, flexShrink: 0 }}>
        {label}
      </div>
      <div
        className="text-[12.5px] flex-1 break-words"
        style={{ fontFamily: mono ? 'monospace' : 'Albert Sans', color: value == null || value === '' ? C.inkMuted : C.ink }}
      >
        {value == null || value === '' ? '—' : value}
      </div>
    </div>
  );

  const Chips = ({ items, color = C.ink, bg = C.creamSoft }) => {
    if (!items || items.length === 0) {
      return <span className="text-[12.5px]" style={{ color: C.inkMuted, fontFamily: 'Albert Sans' }}>—</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {items.map((it, i) => (
          <span
            key={`${it}-${i}`}
            className="rounded-full px-2 py-0.5 text-[11.5px]"
            style={{ background: bg, color, fontFamily: 'Albert Sans' }}
          >
            {it}
          </span>
        ))}
      </div>
    );
  };
```

- [ ] **Step 3: Replace the placeholder body**

Find the body block from Task 3:

```jsx
        {/* Body — Task 5 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="text-[12px]" style={{ fontFamily: 'Albert Sans', color: C.inkMuted }}>
            (body — Task 5)
          </div>
        </div>
```

Replace with:

```jsx
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5">
          <Section title="Photos">
            {Array.isArray(mom.photos) && mom.photos.length ? (
              <div className="flex flex-wrap gap-1.5">
                {mom.photos.map((url, i) => (
                  <img
                    key={`${url}-${i}`}
                    src={url}
                    alt=""
                    className="rounded-lg"
                    style={{ width: 44, height: 44, objectFit: 'cover', border: `1px solid ${C.divider}` }}
                  />
                ))}
              </div>
            ) : (
              <span className="text-[12.5px]" style={{ color: C.inkMuted, fontFamily: 'Albert Sans' }}>No photos</span>
            )}
          </Section>

          <Section title="Bio">
            <div className="text-[13px] leading-snug" style={{ fontFamily: 'Albert Sans', color: mom.bio ? C.ink : C.inkMuted }}>
              {mom.bio || '—'}
            </div>
          </Section>

          <Section title="Identity">
            <KV label="Display name" value={mom.display_name}/>
            <KV label="Username"     value={mom.username ? `@${mom.username}` : null}/>
            <KV label="Age"          value={mom.age}/>
            <KV label="Profile id"   value={mom.id} mono/>
            <KV label="Auth user id" value={mom.auth_user_id} mono/>
          </Section>

          <Section title="Family">
            <KV label="Kids ages" value={fmtKidsAges(mom.kids_ages)}/>
            <div className="flex items-baseline gap-3 py-0.5">
              <div className="text-[11.5px]" style={{ fontFamily: 'Albert Sans', color: C.inkMuted, width: 110, flexShrink: 0 }}>Mom types</div>
              <div className="flex-1"><Chips items={mom.mom_types}/></div>
            </div>
          </Section>

          <Section title="Preferences">
            <div className="flex items-baseline gap-3 py-0.5">
              <div className="text-[11.5px]" style={{ fontFamily: 'Albert Sans', color: C.inkMuted, width: 110, flexShrink: 0 }}>Values</div>
              <div className="flex-1"><Chips items={mom.values} bg={`${C.saffron}25`}/></div>
            </div>
            <div className="flex items-baseline gap-3 py-0.5">
              <div className="text-[11.5px]" style={{ fontFamily: 'Albert Sans', color: C.inkMuted, width: 110, flexShrink: 0 }}>Interests</div>
              <div className="flex-1"><Chips items={mom.interests} bg={`${C.sageDark}20`} color={C.sageDark}/></div>
            </div>
            <div className="flex items-baseline gap-3 py-0.5">
              <div className="text-[11.5px]" style={{ fontFamily: 'Albert Sans', color: C.inkMuted, width: 110, flexShrink: 0 }}>Free slots</div>
              <div className="flex-1"><Chips items={mom.free_slots}/></div>
            </div>
            <div className="flex items-baseline gap-3 py-0.5">
              <div className="text-[11.5px]" style={{ fontFamily: 'Albert Sans', color: C.inkMuted, width: 110, flexShrink: 0 }}>Places</div>
              <div className="flex-1"><Chips items={(mom.places || []).map(placeName)}/></div>
            </div>
            <KV
              label="Pref. events"
              value={mom.preferred_event_ids?.length
                ? `${mom.preferred_event_ids.length} event${mom.preferred_event_ids.length === 1 ? '' : 's'}: ${mom.preferred_event_ids.slice(0, 3).map(id => id.slice(0, 8)).join(', ')}${mom.preferred_event_ids.length > 3 ? '…' : ''}`
                : null}
            />
          </Section>

          <Section title="Geo">
            <KV label="City"         value={mom.city}/>
            <KV label="Neighborhood" value={mom.neighborhood}/>
            <KV label="Lat / Lng"    value={mom.home_lat != null && mom.home_lng != null ? `${Number(mom.home_lat).toFixed(6)}, ${Number(mom.home_lng).toFixed(6)}` : null} mono/>
            <KV label="Distance"     value={mom.distance_miles != null ? `${mom.distance_miles} mi` : null}/>
          </Section>

          <Section title="Flags">
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'visible',        label: 'Visible',   on: !!mom.visible,        onColor: C.sageDark },
                { key: 'verified',       label: 'Verified',  on: !!mom.verified,       onColor: C.sageDark },
                { key: 'blocked_global', label: 'Blocked',   on: !!mom.blocked_global, onColor: C.terracotta },
              ].map(f => (
                <span
                  key={f.key}
                  className="rounded-full px-2.5 py-1 text-[11px]"
                  style={{
                    background: f.on ? `${f.onColor}20` : C.creamSoft,
                    color: f.on ? f.onColor : C.inkMuted,
                    fontFamily: 'Albert Sans', fontWeight: 700, letterSpacing: '.04em',
                  }}
                >
                  {f.label} · {f.on ? 'on' : 'off'}
                </span>
              ))}
            </div>
          </Section>

          <Section title="Social">
            {mom.social_links && typeof mom.social_links === 'object' && Object.keys(mom.social_links).length ? (
              <pre
                className="text-[11.5px] rounded-lg p-2 overflow-x-auto"
                style={{ background: C.creamSoft, color: C.ink, fontFamily: 'monospace' }}
              >
                {JSON.stringify(mom.social_links, null, 2)}
              </pre>
            ) : (
              <span className="text-[12.5px]" style={{ color: C.inkMuted, fontFamily: 'Albert Sans' }}>—</span>
            )}
          </Section>

          <Section title="Audit">
            <KV label="Source"      value={mom.source}/>
            <KV label="Created"     value={fmtAbsolute(mom.created_at)} />
            <KV label="Updated"     value={fmtAbsolute(mom.updated_at)} />
            <KV label="Last active" value={mom.last_active_at ? `${fmtAbsolute(mom.last_active_at)} (${fmtRelative(mom.last_active_at)})` : null}/>
          </Section>

          {/* Bottom spacer so the last section isn't flush against the footer */}
          <div style={{ height: 12 }}/>
        </div>
```

- [ ] **Step 4: Manual verify**

Reload the admin page → Mom profiles → click a row with rich data:
- ✅ All 9 sections render (Photos, Bio, Identity, Family, Preferences, Geo, Flags, Social, Audit).
- ✅ Photos section shows 44×44 thumbnails or "No photos".
- ✅ Bio renders as full text or "—".
- ✅ Identity shows display_name, @username, age, profile id (mono), auth_user_id (mono).
- ✅ Family shows "1× 0–1, 2× 3–5"-style kids string and mom_types as cream-tinted chips.
- ✅ Preferences shows values (saffron-tint), interests (sage-tint), free_slots (cream), places (cream — names if found, UUID prefix otherwise), preferred event count.
- ✅ Geo shows city, neighborhood, lat/lng (mono, 6 decimal places), distance.
- ✅ Flags shows three pills with on/off state colored sage (visible/verified) or terracotta (blocked).
- ✅ Social shows pretty-printed JSON or "—".
- ✅ Audit shows source, created/updated/last_active timestamps.
- ✅ Body scrolls if it exceeds 90vh. Header and footer remain pinned.

Click a row with mostly empty fields:
- ✅ Empty fields show "—" not crashing.

Verify a row whose `places[]` includes a UUID NOT in the loaded `places` table:
- ✅ Chip shows the first 8 chars of the UUID, no crash.

- [ ] **Step 5: Commit**

```bash
git add src/AdminPage.jsx
git commit -m "feat(admin): mom-profile modal body — full field rendering"
```

---

## Task 6: Modal footer — three flag toggle buttons with optimistic updates

Replaces the placeholder footer from Task 3. Adds three buttons (Verified, Visible, Block) that flip the corresponding flag, send a `POST /api/admin/mom-profiles/update`, and roll back the optimistic flip on failure.

**Files:**
- Modify: the `MomProfileDetailModal` footer block + add `useState` for pending/error.

- [ ] **Step 1: Add pending + error state**

Inside `MomProfileDetailModal`, just above the existing `useEffect(() => { … Esc … })` block, add:

```jsx
  const [pendingFlag, setPendingFlag] = useState(null); // 'verified' | 'visible' | 'blocked_global' | null
  const [actionError, setActionError] = useState(null);
```

- [ ] **Step 2: Add the toggle handler**

Just below the `placeName` helper from Task 5 Step 1, add:

```jsx
  const togglePatch = async (key) => {
    if (pendingFlag) return; // serialize requests
    const next = !mom[key];
    const previous = mom; // captured for rollback
    // Optimistic flip: update local view immediately.
    onPatched({ ...mom, [key]: next });
    setPendingFlag(key);
    setActionError(null);
    try {
      const r = await fetch('/api/admin/mom-profiles/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: mom.id, patch: { [key]: next } }),
      });
      const ct = r.headers.get('content-type') || '';
      const text = await r.text();
      if (!ct.includes('application/json')) {
        if (text.trimStart().startsWith('//') || text.includes('export default async function')) {
          throw new Error("API routes don't run under `npm run dev`. Use `vercel dev` or a deployed preview.");
        }
        throw new Error(`Unexpected ${r.status} response`);
      }
      const body = JSON.parse(text);
      if (!r.ok) throw new Error(body?.error || `Server returned ${r.status}`);
      // Replace the optimistic shape with the server's authoritative row
      // (which also has fresh updated_at, etc).
      onPatched(body.row);
    } catch (e) {
      // Roll back to the pre-click state.
      onPatched(previous);
      setActionError(e?.message || 'Network error');
    } finally {
      setPendingFlag(null);
    }
  };
```

- [ ] **Step 3: Replace the placeholder footer**

Find the footer block from Task 3:

```jsx
        {/* Footer — Task 6 */}
        <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: `1px solid ${C.divider}`, background: C.cream }}>
          <div className="text-[12px]" style={{ fontFamily: 'Albert Sans', color: C.inkMuted }}>
            (footer — Task 6)
          </div>
        </div>
```

Replace with:

```jsx
        {/* Footer */}
        <div style={{ borderTop: `1px solid ${C.divider}`, background: C.cream }}>
          <div className="px-5 py-3 flex items-center gap-2 flex-wrap">
            {[
              { key: 'verified',       label: 'Verified', onColor: C.terracotta, offLabel: 'Mark verified',   onLabel: 'Verified ✓' },
              { key: 'visible',        label: 'Visible',  onColor: C.sageDark,   offLabel: 'Mark visible',    onLabel: 'Visible ✓'  },
              { key: 'blocked_global', label: 'Block',    onColor: C.terracotta, offLabel: 'Block globally',  onLabel: 'Blocked'    },
            ].map(b => {
              const on = !!mom[b.key];
              const isPending = pendingFlag === b.key;
              return (
                <button
                  key={b.key}
                  onClick={() => togglePatch(b.key)}
                  disabled={isPending}
                  aria-pressed={on}
                  className="rounded-full px-3 py-1.5 transition-colors"
                  style={{
                    background: on ? b.onColor : C.paper,
                    color: on ? '#fff' : C.ink,
                    border: `1px solid ${on ? b.onColor : C.divider}`,
                    fontFamily: 'Albert Sans',
                    fontWeight: 600,
                    fontSize: 12.5,
                    opacity: isPending ? 0.6 : 1,
                    cursor: isPending ? 'wait' : 'pointer',
                  }}
                >
                  {isPending ? '…' : (on ? b.onLabel : b.offLabel)}
                </button>
              );
            })}
          </div>
          {actionError && (
            <div
              className="px-5 pb-3 text-[11.5px]"
              style={{ fontFamily: 'Albert Sans', color: C.terracotta }}
              role="alert"
            >
              {actionError}
            </div>
          )}
        </div>
```

- [ ] **Step 4: Manual verify (requires `vercel dev` or a deployed preview)**

Skip this step if you can't run the API locally. The next step covers the dev-server fallback path.

Run `vercel dev` (or open the deployed preview).

In the admin page → Mom profiles → click a row with `verified: false`:
- ✅ Footer shows three buttons: `Mark verified` (paper bg), `Visible ✓` (sage bg, assuming mom is visible), `Block globally` (paper bg).
- ✅ Click `Mark verified`. The button **immediately** flips to `Verified ✓` (terracotta bg), the Flags section's "Verified · on" pill turns sage, and the header sprouts a `✓` next to the name. The button text shows `…` for the in-flight moment, then re-renders with the server's updated row (visible by checking `Updated` in the Audit section moves to "just now").
- ✅ Close the modal. The table row should still reflect the new flag (no full reload required) — re-open and confirm.
- ✅ Click `Verified ✓` again to toggle back. Terracotta bg → paper bg.

Test the whitelist guardrail (DevTools console, while the modal is open):
```js
fetch('/api/admin/mom-profiles/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: '00000000-0000-4000-8000-000000000000', patch: { display_name: 'pwned' } })
}).then(r => r.json()).then(console.log);
```
Expected: `{ error: 'unknown patch field: display_name' }` (the endpoint refused the non-allowlisted key).

- [ ] **Step 5: Manual verify the dev-server fallback path**

Run `npm run dev` (no Vercel).

Click a row → click any toggle button:
- ✅ The flag flips visually for a moment (optimistic update), then snaps back when the request fails.
- ✅ Within a second the button text stops showing `…` and reverts to its original label.
- ✅ Inline error appears under the buttons in terracotta: "API routes don't run under `npm run dev`. Use `vercel dev` or a deployed preview."
- ✅ The flag in the modal matches the original (rollback succeeded).

- [ ] **Step 6: Commit**

```bash
git add src/AdminPage.jsx
git commit -m "feat(admin): mom-profile flag toggles — verified/visible/blocked"
```

---

## Task 7: Final QA pass

No code changes. Walk the spec's Testing section end-to-end on a deployed preview (or `vercel dev`) and tick off each scenario.

- [ ] **Step 1: Click a row → modal opens with all sections populated**

- [ ] **Step 2: Toggle each of the three flags → table behind the modal updates immediately, refresh confirms persistence**

Toggle `verified`, close the modal, observe the (newly added) "Verified · on" status visible somewhere in the row's hover affordance — actually, the table doesn't render a verified column right now. Workaround: re-open the modal and confirm the flag stuck. Then refresh the whole page and re-open: the flag is still set. (If a dedicated verified column in the table seems valuable, capture as a follow-up — out of scope here.)

- [ ] **Step 3: Toggle a flag with the dev server offline → optimistic flip rolls back, error appears**

To simulate "offline" cleanly: open DevTools → Network → set throttling to "Offline", then click a flag in the modal. The flag should flip immediately (optimistic), the network request should fail, and the flag should snap back. Restore throttling to "No throttling" afterward.

- [ ] **Step 4: Click backdrop, X, and Esc → all close the modal**

- [ ] **Step 5: Open a mom with empty `photos`, `bio`, `social_links`, `last_active_at` → muted "—" placeholders, no crash**

- [ ] **Step 6: Open a mom with a `places[]` UUID that isn't in the loaded `places` table → chip renders the prefix without crashing**

If you don't have a real such mom, simulate by editing the `placesById` Map in DevTools: open the modal, in the React DevTools find the modal component, and either clear the prop or rename a place id. (Or just trust that `placeName` returns `uuid.slice(0,8)` for a missed lookup — it's a one-line code path.)

- [ ] **Step 7: Note any deviations**

If anything in the QA pass feels off, fix inline before declaring done. Things to watch for:

- **Esc inside an input:** if the body ever adds editable fields, the global Esc listener might steal focus from typing. Not an issue today (read-only).
- **Verified column in table:** the moms table doesn't have a verified column today, so toggling `verified` in the modal isn't visible in the table after closing — only the modal reflects it. If the user wants table parity, that's a follow-up (out of scope here).

- [ ] **Step 8: No commit unless code changed**

If you made tweaks during QA, commit them with a focused message. Otherwise this task is just verification — no commit required.

---

## File summary

After all tasks complete, the changeset is:

| File | Action | Purpose |
|---|---|---|
| `api/admin/mom-profiles/update.js` | Create | POST endpoint, whitelisted flag PATCH |
| `src/AdminPage.jsx` | Modify | Add `places` fetch, `selectedMom` state, row click, `MomProfileDetailModal` component, `X` import |
| `docs/superpowers/specs/2026-05-07-admin-mom-profile-detail-design.md` | (already committed) | Spec |
| `docs/superpowers/plans/2026-05-07-admin-mom-profile-detail.md` | (this file) | Plan |

No new test files (no test framework). No new components in standalone files (matches `AdminPage.jsx`'s in-file convention). No schema migrations (the columns we patch already exist).
