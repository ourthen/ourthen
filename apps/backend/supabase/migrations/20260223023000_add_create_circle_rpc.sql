-- Create circle + self membership atomically using auth.uid() from JWT context.

create or replace function public.create_circle_with_membership(p_name text)
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
  v_circle_id uuid;
  v_circle_name text;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'not_authenticated'
      using errcode = 'P0001';
  end if;

  if p_name is null or char_length(trim(p_name)) = 0 then
    raise exception 'invalid_circle_name'
      using errcode = 'P0001';
  end if;

  insert into public.circles (name, created_by)
  values (trim(p_name), v_uid)
  returning circles.id, circles.name
  into v_circle_id, v_circle_name;

  insert into public.circle_members (circle_id, user_id, role)
  values (v_circle_id, v_uid, 'admin')
  on conflict (circle_id, user_id)
  do update set role = 'admin';

  return query
  select v_circle_id, v_circle_name, 'admin'::text;
end;
$$;

revoke all on function public.create_circle_with_membership(text) from public;
grant execute on function public.create_circle_with_membership(text) to authenticated;
