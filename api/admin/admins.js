// /api/admin/admins — manage the console admin allowlist (app_config.admin_users).
// SECURITY: requireAdmin bearer token.
//   GET                              -> { admins, modules, currentEmail }
//   POST   { email, role, modules }  -> add or update an admin
//   DELETE { email }                 -> remove an admin (not self / not last)
//
// The allowlist is the source of truth for who may email-OTP in, plus their
// role + module access. Roles/modules are stored now; enforcement is deferred
// (everyone is effectively a full admin until gating is switched on).
import { json, readJsonBody, supabaseCreds, sbHeaders } from '../_lib/supabase.js';
import { requireAdmin } from '../_lib/admin-auth.js';

// Valid module ids — admin nav section ids. '*' (all) is handled separately.
// Keep in sync with src/screens/admin/nav.js NAV_GROUPS.
const MODULES = [
  { id: 'overview', label: 'Overview' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'mom-profiles', label: 'Mom profiles' },
  { id: 'users', label: 'User management' },
  { id: 'places', label: 'Places' },
  { id: 'events', label: 'Events & meetup' },
  { id: 'featured', label: 'Featured' },
  { id: 'ingestion', label: 'Ingestion' },
  { id: 'sources', label: 'Sources' },
  { id: 'config', label: 'Config' },
  { id: 'deployments', label: 'Deployments' },
  { id: 'actions', label: 'Quick actions' },
  { id: 'admins', label: 'Admins' },
];
const MODULE_IDS = new Set(MODULES.map((m) => m.id));
const ROLES = new Set(['full', 'read-write', 'read-only']);

const readAdmins = async (creds) => {
  const r = await fetch(
    `${creds.supabaseUrl}/rest/v1/app_config?key=eq.admin_users&select=value`,
    { headers: sbHeaders(creds.serviceRoleKey) },
  );
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  const v = (await r.json())?.[0]?.value;
  return Array.isArray(v) ? v.filter((a) => a && typeof a.email === 'string') : [];
};

const writeAdmins = async (creds, admins) => {
  const r = await fetch(`${creds.supabaseUrl}/rest/v1/app_config?on_conflict=key`, {
    method: 'POST',
    headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify({ key: 'admin_users', value: admins }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Supabase ${r.status}: ${t.slice(0, 200)}`);
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

  const me = requireAdmin(req, res);
  if (!me) return;

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });
  const myEmail = String(me.email).toLowerCase();

  try {
    if (req.method === 'GET') {
      const admins = await readAdmins(creds);
      return json(res, 200, { admins, modules: MODULES, currentEmail: me.email });
    }

    if (req.method === 'POST') {
      const body = readJsonBody(req);
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
      const role = body?.role || 'full';
      let modules = body?.modules;
      if (!email || !email.includes('@')) return json(res, 400, { error: 'A valid email is required' });
      if (!ROLES.has(role)) return json(res, 400, { error: `role must be one of: ${[...ROLES].join(', ')}` });
      // Normalize modules: 'full' ⇒ all; otherwise a non-empty subset of known ids.
      if (role === 'full') {
        modules = ['*'];
      } else {
        if (!Array.isArray(modules) || modules.length === 0) return json(res, 400, { error: 'Select at least one module' });
        if (modules.includes('*')) modules = ['*'];
        else {
          const bad = modules.filter((m) => !MODULE_IDS.has(m));
          if (bad.length) return json(res, 400, { error: `unknown modules: ${bad.join(', ')}` });
        }
      }

      const admins = await readAdmins(creds);
      const idx = admins.findIndex((a) => a.email.toLowerCase() === email);
      const entry = {
        email,
        role,
        modules,
        addedBy: idx >= 0 ? (admins[idx].addedBy || me.email) : me.email,
        addedAt: idx >= 0 ? (admins[idx].addedAt || new Date().toISOString()) : new Date().toISOString(),
      };
      if (idx >= 0) admins[idx] = entry; else admins.push(entry);
      await writeAdmins(creds, admins);
      return json(res, 200, { ok: true, admin: entry, admins });
    }

    if (req.method === 'DELETE') {
      const body = readJsonBody(req);
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!email) return json(res, 400, { error: 'email required' });
      if (email === myEmail) return json(res, 400, { error: "You can't remove yourself." });

      const admins = await readAdmins(creds);
      if (!admins.some((a) => a.email.toLowerCase() === email)) {
        return json(res, 404, { error: 'Not an admin' });
      }
      if (admins.length <= 1) return json(res, 400, { error: "Can't remove the last admin." });

      const next = admins.filter((a) => a.email.toLowerCase() !== email);
      await writeAdmins(creds, next);
      return json(res, 200, { ok: true, admins: next });
    }

    return json(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Could not reach Supabase' });
  }
}
