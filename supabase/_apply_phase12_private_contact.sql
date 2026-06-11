-- Phase 12 — private verified contact info.
-- A mom can add a phone + email to her profile, each verified by a Supabase OTP
-- code. The verified values are mirrored here from the auth user (by
-- api/mom-profiles/sync-contact, service role) so server code can read them.
--
-- PRIVATE: these columns are NEVER selected by any public mom-card / nearby /
-- directory query (those use explicit column lists). They exist only for the
-- owner + admin. Do not add them to any public select or to the client-writable
-- allowlist — they're written only from the verified auth identity.

alter table public.mom_profiles add column if not exists contact_email text;
alter table public.mom_profiles add column if not exists contact_phone text;

comment on column public.mom_profiles.contact_email is 'PRIVATE. Verified email mirrored from auth.users by api/mom-profiles/sync-contact. Never returned in public mom-card / nearby / directory responses.';
comment on column public.mom_profiles.contact_phone is 'PRIVATE. Verified phone (E.164) mirrored from auth.users by api/mom-profiles/sync-contact. Never returned in public mom-card / nearby / directory responses.';
