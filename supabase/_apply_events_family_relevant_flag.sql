-- events.family_relevant — marks events that are NOT mom/family relevant.
--
-- Added for the `create-event` skill's SOFT relevance guardrail: when an
-- off-topic event (business / networking / pitch / 21+ / adult-only) is
-- force-created against the recommendation to skip, it is stored with
-- family_relevant=false so the app + admin can hide or label it. Defaults
-- true, so every existing event is treated as family-relevant.
--
-- Applied to remote via Supabase migration `add_events_family_relevant_flag`.

alter table public.events
  add column if not exists family_relevant boolean not null default true;

comment on column public.events.family_relevant is
  'False = NOT a mom/family-relevant event (e.g. business/networking/21+/adult-only). Defaults true. Set false by the create-event skill when an off-topic event is force-created against the soft relevance guardrail; intended to drive hiding/labeling in the app + admin.';
