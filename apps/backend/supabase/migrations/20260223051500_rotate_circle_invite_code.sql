-- Rotate invite codes: issuing a new one revokes previous active codes for the same circle.

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

  update public.circle_invites ci
  set revoked_at = now()
  where ci.circle_id = p_circle_id
    and ci.revoked_at is null
    and (ci.expires_at is null or ci.expires_at > now());

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
