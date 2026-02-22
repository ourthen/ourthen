-- Allow circle admins to read the latest active invite code without creating new rows.

create or replace function public.get_latest_circle_invite_code(p_circle_id uuid)
returns table (
  code text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
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

  return query
  select ci.code, ci.created_at
  from public.circle_invites ci
  where ci.circle_id = p_circle_id
    and ci.revoked_at is null
    and (ci.expires_at is null or ci.expires_at > now())
  order by ci.created_at desc
  limit 1;
end;
$$;

revoke all on function public.get_latest_circle_invite_code(uuid) from public;
grant execute on function public.get_latest_circle_invite_code(uuid) to authenticated;
