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
  scheduledAt: string | null;
};

export type CircleMemberSummary = {
  userId: string;
  role: CircleRole;
  joinedAt: string | null;
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

export async function fetchLatestCircleInviteCode(circleId: string): Promise<string | null> {
  if (!circleId.trim()) {
    throw new Error("모임 정보를 찾을 수 없어요.");
  }

  const { data, error } = await supabase.rpc("get_latest_circle_invite_code", {
    p_circle_id: circleId,
  });

  if (error) {
    if (error.message === "not_circle_admin") {
      return null;
    }
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object" || !("code" in row)) {
    return null;
  }

  const code = String((row as { code: unknown }).code).trim();
  return code || null;
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
    .select("id, title, status, scheduled_at, created_at")
    .eq("circle_id", circleId)
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (
    (data as Array<{
      id: string;
      title: string;
      status: string;
      scheduled_at: string | null;
    }> | null)?.map(
      (row) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        scheduledAt: row.scheduled_at,
      }),
    ) ?? []
  );
}

export async function fetchCircleMembers(
  circleId: string,
): Promise<CircleMemberSummary[]> {
  const { data, error } = await supabase
    .from("circle_members")
    .select("user_id, role, joined_at")
    .eq("circle_id", circleId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw error;
  }

  const rows =
    (data as Array<{ user_id: string; role: CircleRole; joined_at: string | null }> | null) ??
    [];

  return rows.map((row) => ({
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
  }));
}

type RawPieceFeedRow = {
  body: string | null;
  pieces:
    | {
        id: string;
      }
    | Array<{
        id: string;
      }>
    | null;
};

export async function fetchPiecesByCircle(circleId: string): Promise<PieceSummary[]> {
  const { data, error } = await supabase
    .from("feed_items")
    .select("body, created_at, pieces!inner(id)")
    .eq("circle_id", circleId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    throw error;
  }

  return ((data as unknown as RawPieceFeedRow[]) ?? []).map((row, index) => {
    const piece = Array.isArray(row.pieces) ? row.pieces[0] : row.pieces;
    return {
      id: piece?.id ?? `missing-piece-${index + 1}`,
      label: row.body?.trim() || `기억 조각 ${index + 1}`,
    };
  });
}

export async function createMeetup(
  circleId: string,
  userId: string,
  title: string,
  scheduledAt: string,
): Promise<MeetupSummary> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new Error("모임 제목을 입력해 주세요.");
  }

  if (!scheduledAt.trim()) {
    throw new Error("모임 날짜와 시간을 입력해 주세요.");
  }

  const scheduledDate = new Date(scheduledAt);
  if (Number.isNaN(scheduledDate.getTime())) {
    throw new Error("모임 날짜 형식이 올바르지 않아요.");
  }

  const { data, error } = await supabase
    .from("meetups")
    .insert({
      circle_id: circleId,
      host_id: userId,
      title: trimmedTitle,
      status: "planned",
      scheduled_at: scheduledDate.toISOString(),
    })
    .select("id, title, status, scheduled_at")
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    title: data.title,
    status: data.status,
    scheduledAt: data.scheduled_at,
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
