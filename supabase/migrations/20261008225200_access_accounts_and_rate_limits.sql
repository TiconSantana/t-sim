create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists public.access_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  registration text not null,
  registration_normalized text not null unique,
  full_name text not null,
  email text not null,
  email_normalized text not null,
  phone text not null,
  company text not null,
  job_title text not null,
  access_status text not null default 'pending' check (access_status in ('pending', 'approved', 'denied', 'suspended')),
  is_admin boolean not null default false,
  initial_notification_status text not null default 'pending' check (initial_notification_status in ('pending', 'sent', 'failed')),
  decision_notification_status text check (decision_notification_status in ('pending', 'sent', 'failed')),
  notification_error text,
  denial_reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint access_profiles_email_unique unique (email_normalized)
);

create index if not exists access_profiles_pending_created_idx
  on public.access_profiles (created_at) where access_status = 'pending';
create unique index if not exists access_profiles_single_admin_idx
  on public.access_profiles (is_admin) where is_admin = true;

create table if not exists public.access_audit_log (
  id bigint generated always as identity primary key,
  target_user_id uuid references auth.users(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('request_created', 'approved', 'denied', 'suspended', 'notification_retried', 'admin_bootstrapped')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists private.access_rate_limits (
  bucket_key text primary key,
  attempt_count integer not null,
  window_started_at timestamptz not null
);

alter table public.access_profiles enable row level security;
alter table public.access_audit_log enable row level security;
alter table private.access_rate_limits enable row level security;

revoke all on public.access_profiles from public, anon, authenticated;
revoke all on public.access_audit_log from public, anon, authenticated;
revoke all on private.access_rate_limits from public, anon, authenticated;
grant all on public.access_profiles to service_role;
grant all on public.access_audit_log to service_role;
grant all on private.access_rate_limits to service_role;
grant usage, select on sequence public.access_audit_log_id_seq to service_role;

create or replace function public.consume_access_rate_limit(
  p_bucket_key text,
  p_max_attempts integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
begin
  if p_bucket_key is null or length(p_bucket_key) <> 64
    or p_max_attempts < 1 or p_window_seconds < 1 then
    return false;
  end if;

  delete from private.access_rate_limits
  where window_started_at < now() - interval '24 hours';

  insert into private.access_rate_limits as limits (bucket_key, attempt_count, window_started_at)
  values (p_bucket_key, 1, now())
  on conflict (bucket_key) do update
    set attempt_count = case
      when limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1
      else limits.attempt_count + 1
    end,
    window_started_at = case
      when limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then now()
      else limits.window_started_at
    end
  returning attempt_count into current_count;

  return current_count <= p_max_attempts;
end;
$$;

revoke all on function public.consume_access_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_access_rate_limit(text, integer, integer) to service_role;

create or replace function public.review_access_request(
  p_target_user_id uuid,
  p_actor_user_id uuid,
  p_decision text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.access_profiles%rowtype;
begin
  if p_decision not in ('approved', 'denied') then
    raise exception 'Invalid access decision' using errcode = '22023';
  end if;
  if p_decision = 'denied' and length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'A denial reason is required' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.access_profiles admin_profile
    where admin_profile.user_id = p_actor_user_id
      and admin_profile.is_admin = true
      and admin_profile.access_status = 'approved'
  ) then
    raise exception 'Administrative access required' using errcode = '42501';
  end if;

  select * into target
  from public.access_profiles request_profile
  where request_profile.user_id = p_target_user_id
    and request_profile.access_status = 'pending'
  for update;

  if not found then
    raise exception 'Pending access request not found' using errcode = 'P0002';
  end if;

  update public.access_profiles
  set access_status = p_decision,
      denial_reason = case when p_decision = 'denied' then trim(p_reason) else null end,
      reviewed_at = now(),
      reviewed_by = p_actor_user_id,
      decision_notification_status = 'pending',
      notification_error = null,
      updated_at = now()
  where user_id = p_target_user_id
  returning * into target;

  insert into public.access_audit_log (target_user_id, actor_user_id, action, details)
  values (
    target.user_id,
    p_actor_user_id,
    p_decision,
    jsonb_build_object('reason', case when p_decision = 'denied' then trim(p_reason) else null end)
  );

  return to_jsonb(target);
end;
$$;

revoke all on function public.review_access_request(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_access_request(uuid, uuid, text, text) to service_role;
