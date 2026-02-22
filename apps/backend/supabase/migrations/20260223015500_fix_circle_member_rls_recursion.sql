-- Fix infinite recursion in circle_members policies by using SECURITY DEFINER helpers.

create or replace function public.is_current_user_circle_member(p_circle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.circle_members cm
    where cm.circle_id = p_circle_id
      and cm.user_id = auth.uid()
  );
$$;

create or replace function public.is_current_user_circle_admin(p_circle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.circle_members cm
    where cm.circle_id = p_circle_id
      and cm.user_id = auth.uid()
      and cm.role = 'admin'
  );
$$;

revoke all on function public.is_current_user_circle_member(uuid) from public;
revoke all on function public.is_current_user_circle_admin(uuid) from public;
grant execute on function public.is_current_user_circle_member(uuid) to authenticated;
grant execute on function public.is_current_user_circle_admin(uuid) to authenticated;

drop policy if exists "circle_member_select_circles" on public.circles;
create policy "circle_member_select_circles"
on public.circles
for select
using (public.is_current_user_circle_member(circles.id));

drop policy if exists "circle_member_select_circle_members" on public.circle_members;
create policy "circle_member_select_circle_members"
on public.circle_members
for select
using (public.is_current_user_circle_member(circle_members.circle_id));

drop policy if exists "circle_member_insert_self_membership" on public.circle_members;
create policy "circle_member_insert_self_membership"
on public.circle_members
for insert
with check (
  user_id = auth.uid()
  and (
    exists (
      select 1
      from public.circles c
      where c.id = circle_members.circle_id
        and c.created_by = auth.uid()
    )
    or public.is_current_user_circle_admin(circle_members.circle_id)
  )
);

drop policy if exists "circle_member_select_feed_items" on public.feed_items;
create policy "circle_member_select_feed_items"
on public.feed_items
for select
using (public.is_current_user_circle_member(feed_items.circle_id));

drop policy if exists "circle_member_insert_feed_items" on public.feed_items;
create policy "circle_member_insert_feed_items"
on public.feed_items
for insert
with check (
  author_id = auth.uid()
  and public.is_current_user_circle_member(feed_items.circle_id)
);

drop policy if exists "circle_member_select_pieces" on public.pieces;
create policy "circle_member_select_pieces"
on public.pieces
for select
using (
  exists (
    select 1
    from public.feed_items fi
    where fi.id = pieces.feed_item_id
      and public.is_current_user_circle_member(fi.circle_id)
  )
);

drop policy if exists "circle_member_select_meetups" on public.meetups;
create policy "circle_member_select_meetups"
on public.meetups
for select
using (public.is_current_user_circle_member(meetups.circle_id));

drop policy if exists "circle_member_insert_meetups" on public.meetups;
create policy "circle_member_insert_meetups"
on public.meetups
for insert
with check (
  host_id = auth.uid()
  and public.is_current_user_circle_member(meetups.circle_id)
);

drop policy if exists "circle_member_select_piece_mentions" on public.piece_mentions;
create policy "circle_member_select_piece_mentions"
on public.piece_mentions
for select
using (
  exists (
    select 1
    from public.meetups m
    where m.id = piece_mentions.meetup_id
      and public.is_current_user_circle_member(m.circle_id)
  )
);

drop policy if exists "circle_member_insert_piece_mentions" on public.piece_mentions;
create policy "circle_member_insert_piece_mentions"
on public.piece_mentions
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.meetups m
    where m.id = piece_mentions.meetup_id
      and public.is_current_user_circle_member(m.circle_id)
  )
  and exists (
    select 1
    from public.meetups m
    join public.pieces p on p.id = piece_mentions.piece_id
    join public.feed_items fi on fi.id = p.feed_item_id
    where m.id = piece_mentions.meetup_id
      and fi.circle_id = m.circle_id
  )
);

drop policy if exists "circle_member_select_piece_comments" on public.piece_comments;
create policy "circle_member_select_piece_comments"
on public.piece_comments
for select
using (
  exists (
    select 1
    from public.pieces p
    join public.feed_items fi on fi.id = p.feed_item_id
    where p.id = piece_comments.piece_id
      and public.is_current_user_circle_member(fi.circle_id)
  )
);

drop policy if exists "circle_member_insert_piece_comments" on public.piece_comments;
create policy "circle_member_insert_piece_comments"
on public.piece_comments
for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.pieces p
    join public.feed_items fi on fi.id = p.feed_item_id
    where p.id = piece_comments.piece_id
      and public.is_current_user_circle_member(fi.circle_id)
  )
  and (
    meetup_id is null
    or exists (
      select 1
      from public.meetups m
      join public.pieces p on p.id = piece_comments.piece_id
      join public.feed_items fi on fi.id = p.feed_item_id
      where m.id = piece_comments.meetup_id
        and fi.circle_id = m.circle_id
    )
  )
);

drop policy if exists "circle_member_select_meetup_attendance" on public.meetup_attendance;
create policy "circle_member_select_meetup_attendance"
on public.meetup_attendance
for select
using (
  exists (
    select 1
    from public.meetups m
    where m.id = meetup_attendance.meetup_id
      and public.is_current_user_circle_member(m.circle_id)
  )
);

drop policy if exists "circle_member_upsert_meetup_attendance" on public.meetup_attendance;
create policy "circle_member_upsert_meetup_attendance"
on public.meetup_attendance
for all
using (
  exists (
    select 1
    from public.meetups m
    where m.id = meetup_attendance.meetup_id
      and public.is_current_user_circle_member(m.circle_id)
  )
  and (
    meetup_attendance.user_id = auth.uid()
    or exists (
      select 1
      from public.meetups m
      where m.id = meetup_attendance.meetup_id
        and m.host_id = auth.uid()
    )
  )
)
with check (
  exists (
    select 1
    from public.meetups m
    where m.id = meetup_attendance.meetup_id
      and public.is_current_user_circle_member(m.circle_id)
  )
  and (
    meetup_attendance.user_id = auth.uid()
    or exists (
      select 1
      from public.meetups m
      where m.id = meetup_attendance.meetup_id
        and m.host_id = auth.uid()
    )
  )
);
