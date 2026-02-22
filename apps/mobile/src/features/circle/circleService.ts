import { supabase } from "../../lib/supabase";

export type CircleRole = "member" | "admin";

type RawCircleRow = {
  circle_id: string;
  role: CircleRole;
  circles:
    | {
        id: string;
        name: string;
      }
    | Array<{
        id: string;
        name: string;
      }>
    | null;
};

export type CircleSummary = {
  id: string;
  name: string;
  role: CircleRole;
};

export type MeetupSummary = {
  id: string;
  title: string;
  status: string;
};

export type PieceSummary = {
  id: string;
  label: string;
};

export function mapCircleRows(rows: RawCircleRow[]): CircleSummary[] {
  return rows
    .map((row) => {
      const circle = Array.isArray(row.circles) ? row.circles[0] : row.circles;
      if (!circle) {
        return null;
      }
      return {
        id: circle.id,
        name: circle.name,
        role: row.role,
      };
    })
    .filter((row): row is CircleSummary => row !== null);
}

export async function createCircleWithMembership(
  name: string,
  userId: string,
): Promise<CircleSummary> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("모임 이름을 입력해 주세요.");
  }

  const { data: circle, error: circleError } = await supabase
    .from("circles")
    .insert({
      name: trimmedName,
      created_by: userId,
    })
    .select("id, name")
    .single();

  if (circleError) {
    throw circleError;
  }

  const { error: membershipError } = await supabase.from("circle_members").insert({
    circle_id: circle.id,
    user_id: userId,
    role: "admin",
  });

  if (membershipError) {
    throw membershipError;
  }

  return {
    id: circle.id,
    name: circle.name,
    role: "admin",
  };
}

export async function fetchMyCircles(userId: string): Promise<CircleSummary[]> {
  const { data, error } = await supabase
    .from("circle_members")
    .select("circle_id, role, circles!inner(id, name)")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return mapCircleRows(((data as unknown as RawCircleRow[]) ?? []));
}

export async function fetchMeetupsByCircle(circleId: string): Promise<MeetupSummary[]> {
  const { data, error } = await supabase
    .from("meetups")
    .select("id, title, status")
    .eq("circle_id", circleId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (
    (data as Array<{ id: string; title: string; status: string }> | null)?.map(
      (row) => ({
        id: row.id,
        title: row.title,
        status: row.status,
      }),
    ) ?? []
  );
}

type RawPieceRow = {
  id: string;
  feed_items:
    | {
        body: string | null;
      }
    | Array<{
        body: string | null;
      }>
    | null;
};

export async function fetchPiecesByCircle(circleId: string): Promise<PieceSummary[]> {
  const { data, error } = await supabase
    .from("pieces")
    .select("id, feed_items!inner(body, circle_id)")
    .eq("feed_items.circle_id", circleId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    throw error;
  }

  return ((data as unknown as RawPieceRow[]) ?? []).map((row, index) => {
    const feedItem = Array.isArray(row.feed_items) ? row.feed_items[0] : row.feed_items;
    return {
      id: row.id,
      label: feedItem?.body?.trim() || `기억 조각 ${index + 1}`,
    };
  });
}

export async function createMeetup(
  circleId: string,
  userId: string,
  title: string,
): Promise<MeetupSummary> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new Error("모임 제목을 입력해 주세요.");
  }

  const { data, error } = await supabase
    .from("meetups")
    .insert({
      circle_id: circleId,
      host_id: userId,
      title: trimmedTitle,
      status: "planned",
    })
    .select("id, title, status")
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    title: data.title,
    status: data.status,
  };
}

export async function createTextPiece(
  circleId: string,
  userId: string,
  body: string,
): Promise<void> {
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    throw new Error("조각 내용을 입력해 주세요.");
  }

  const { error } = await supabase.from("feed_items").insert({
    circle_id: circleId,
    author_id: userId,
    type: "text",
    body: trimmedBody,
  });

  if (error) {
    throw error;
  }
}
