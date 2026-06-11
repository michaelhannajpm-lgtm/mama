-- Web-push fan-out on new chat messages. Applied via Supabase MCP (see also
-- _apply_onboarding_flag_and_push.sql for the push_subscriptions table).
--
-- Secret handling: the shared secret the trigger sends to /api/push/send is
-- stored in Supabase Vault under the name 'push_hook_secret' (NOT in this file,
-- NOT in app_config — app_config is partly client-exposed via /api/config).
-- Seed it once out-of-band:
--   select vault.create_secret('<PUSH_HOOK_SECRET>', 'push_hook_secret');
-- and set the SAME value as the PUSH_HOOK_SECRET env var on Vercel.

create extension if not exists pg_net;

-- Fire a non-blocking POST to the production push endpoint on each message
-- insert. pg_net queues the request so the insert is never delayed; the
-- endpoint resolves recipients, checks each one's notification settings, and
-- delivers via web-push.
create or replace function public.notify_push_on_message()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault, net
as $$
declare
  v_secret text;
begin
  if new.deleted_at is not null then
    return new;
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'push_hook_secret'
  limit 1;

  if v_secret is null then
    return new; -- push not configured; do nothing
  end if;

  perform net.http_post(
    url     := 'https://gomama.app/api/push/send',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-push-secret', v_secret
               ),
    body    := jsonb_build_object('type', 'message', 'message_id', new.id),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

drop trigger if exists messages_push_notify on public.messages;
create trigger messages_push_notify
  after insert on public.messages
  for each row execute function public.notify_push_on_message();
