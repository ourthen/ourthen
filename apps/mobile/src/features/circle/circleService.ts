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

function mapRpcCircleSummaryRow(row: unknown): CircleSummary {
  if (!row || typeof row !== "object" || !("id" in row) || !("name" in row)) {
    throw new Error("모임 정보를 확인할 수 없어요.");
  }

  const role = (row as { role?: unknown }).role === "member" ? "member" : "admin";

  return {
    id: String((row as { id: unknown }).id),
    name: String((row as { name: unknown }).name),
    role,
  };
}

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
): Promise<CircleSummary> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("모임 이름을 입력해 주세요.");
  }

  const { data, error } = await supabase.rpc("create_circle_with_membership", {
    p_name: trimmedName,
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return mapRpcCircleSummaryRow(row);
}

export async function createCircleInviteCode(circleId: string): Promise<string> {
  if (!circleId.trim()) {
    throw new Error("모임 정보를 찾을 수 없어요.");
  }

  const { data, error } = await supabase.rpc("create_circle_invite_code", {
    p_circle_id: circleId,
  });

  if (error) {
    if (error.message === "not_circle_admin") {
      throw new Error("관리자만 초대 코드를 만들 수 있어요.");
    }
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object" || !("code" in row)) {
    throw new Error("초대 코드를 생성하지 못했어요.");
  }

  const code = String((row as { code: unknown }).code).trim();
  if (!code) {
    throw new Error("초대 코드를 생성하지 못했어요.");
  }

  return code;
}

export async function joinCircleByInviteCode(rawCode: string): Promise<CircleSummary> {
  const normalizedInput = rawCode.trim();
  if (!normalizedInput) {
    throw new Error("참여 코드를 입력해 주세요.");
  }

  const { data, error } = await supabase.rpc("join_circle_by_invite_code", {
    p_code: normalizedInput,
  });

  if (error) {
    if (error.message === "invite_not_found" || error.message === "invalid_invite_code") {
      throw new Error("유효한 초대 코드가 아니에요.");
    }
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return mapRpcCircleSummaryRow(row);
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
