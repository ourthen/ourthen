-- Invite code flow for joining circles without exposing direct table writes from clients.

create table if not exists public.circle_invites (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  code text not null unique check (char_length(trim(code)) >= 6),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz
);

create index if not exists circle_invites_circle_created_at_idx
  on public.circle_invites (circle_id, created_at desc);

alter table public.circle_invites enable row level security;

create or replace function public.generate_circle_invite_code()
returns text
language plpgsql
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text := '';
  v_index integer;
begin
  for i in 1..8 loop
    v_index := 1 + floor(random() * length(v_alphabet))::integer;
    v_code := v_code || substr(v_alphabet, v_index, 1);
  end loop;

  return v_code;
end;
$$;

create or replace function public.create_circle_invite_code(p_circle_id uuid)
returns table (code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_code text;
  v_attempt integer := 0;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'not_authenticated'
      using errcode = 'P0001';
  end if;

  if p_circle_id is null then
    raise exception 'invalid_circle_id'
      using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.circle_members cm
    where cm.circle_id = p_circle_id
      and cm.user_id = v_uid
      and cm.role = 'admin'
  ) then
    raise exception 'not_circle_admin'
      using errcode = 'P0001';
  end if;

  loop
    v_attempt := v_attempt + 1;

    if v_attempt > 10 then
      raise exception 'invite_code_generation_failed'
        using errcode = 'P0001';
    end if;

    v_code := public.generate_circle_invite_code();

    begin
      insert into public.circle_invites (circle_id, code, created_by)
      values (p_circle_id, v_code, v_uid);
      exit;
    exception
      when unique_violation then
        continue;
    end;
  end loop;

  return query
  select v_code;
end;
$$;

create or replace function public.join_circle_by_invite_code(p_code text)
returns table (
  id uuid,
  name text,
  role text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_normalized_code text;
  v_circle_id uuid;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'not_authenticated'
      using errcode = 'P0001';
  end if;

  v_normalized_code := upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
  if char_length(v_normalized_code) = 0 then
    raise exception 'invalid_invite_code'
      using errcode = 'P0001';
  end if;

  select ci.circle_id
  into v_circle_id
  from public.circle_invites ci
  where ci.code = v_normalized_code
    and ci.revoked_at is null
    and (ci.expires_at is null or ci.expires_at > now())
  order by ci.created_at desc
  limit 1;

  if v_circle_id is null then
    raise exception 'invite_not_found'
      using errcode = 'P0001';
  end if;

  insert into public.circle_members (circle_id, user_id, role)
  values (v_circle_id, v_uid, 'member')
  on conflict (circle_id, user_id)
  do nothing;

  return query
  select c.id, c.name, cm.role::text
  from public.circles c
  join public.circle_members cm
    on cm.circle_id = c.id
   and cm.user_id = v_uid
  where c.id = v_circle_id
  limit 1;
end;
$$;

revoke all on function public.generate_circle_invite_code() from public;
revoke all on function public.create_circle_invite_code(uuid) from public;
revoke all on function public.join_circle_by_invite_code(text) from public;

grant execute on function public.create_circle_invite_code(uuid) to authenticated;
grant execute on function public.join_circle_by_invite_code(text) to authenticated;
