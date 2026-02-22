import {
  createCircleInviteCode,
  createCircleWithMembership,
  fetchCircleMembers,
  fetchLatestCircleInviteCode,
  joinCircleByInviteCode,
  mapCircleRows,
} from "../circleService";
import { supabase } from "../../../lib/supabase";

jest.mock("../../../lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

describe("circleService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps membership rows to circle summaries", () => {
    const mapped = mapCircleRows([
      {
        circle_id: "circle-1",
        role: "admin",
        circles: { id: "circle-1", name: "우리 동네 팀" },
      },
      {
        circle_id: "circle-2",
        role: "member",
        circles: { id: "circle-2", name: "회사 친구들" },
      },
    ]);

    expect(mapped).toEqual([
      { id: "circle-1", name: "우리 동네 팀", role: "admin" },
      { id: "circle-2", name: "회사 친구들", role: "member" },
    ]);
  });

  it("creates circle via rpc", async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: [{ id: "circle-1", name: "새 모임", role: "admin" }],
      error: null,
    });

    const created = await createCircleWithMembership("  새 모임  ");

    expect(supabase.rpc).toHaveBeenCalledWith("create_circle_with_membership", {
      p_name: "새 모임",
    });
    expect(created).toEqual({ id: "circle-1", name: "새 모임", role: "admin" });
  });

  it("rejects blank circle names", async () => {
    await expect(createCircleWithMembership("   ")).rejects.toEqual(
      expect.objectContaining({ message: "모임 이름을 입력해 주세요." }),
    );
  });

  it("creates invite code via rpc", async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: [{ code: "ABCD1234" }],
      error: null,
    });

    const code = await createCircleInviteCode("circle-1");

    expect(supabase.rpc).toHaveBeenCalledWith("create_circle_invite_code", {
      p_circle_id: "circle-1",
    });
    expect(code).toBe("ABCD1234");
  });

  it("joins circle by invite code", async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: [{ id: "circle-2", name: "친구들", role: "member" }],
      error: null,
    });

    const joined = await joinCircleByInviteCode(" abcd-1234 ");

    expect(supabase.rpc).toHaveBeenCalledWith("join_circle_by_invite_code", {
      p_code: "abcd-1234",
    });
    expect(joined).toEqual({ id: "circle-2", name: "친구들", role: "member" });
  });

  it("rejects blank invite code", async () => {
    await expect(joinCircleByInviteCode("   ")).rejects.toEqual(
      expect.objectContaining({ message: "참여 코드를 입력해 주세요." }),
    );
  });

  it("reads latest invite code for admin", async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: [{ code: "EFGH5678", created_at: "2026-02-23T04:20:00.000Z" }],
      error: null,
    });

    const code = await fetchLatestCircleInviteCode("circle-1");

    expect(supabase.rpc).toHaveBeenCalledWith("get_latest_circle_invite_code", {
      p_circle_id: "circle-1",
    });
    expect(code).toBe("EFGH5678");
  });

  it("loads members for a circle", async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        { user_id: "u1", role: "admin", joined_at: "2026-02-23T12:00:00.000Z" },
        { user_id: "u2", role: "member", joined_at: "2026-02-24T12:00:00.000Z" },
      ],
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "circle_members") {
        return { select };
      }
      return {};
    });

    const members = await fetchCircleMembers("circle-1");

    expect(supabase.from).toHaveBeenCalledWith("circle_members");
    expect(select).toHaveBeenCalledWith("user_id, role, joined_at");
    expect(eq).toHaveBeenCalledWith("circle_id", "circle-1");
    expect(members).toEqual([
      { userId: "u1", role: "admin", joinedAt: "2026-02-23T12:00:00.000Z" },
      { userId: "u2", role: "member", joinedAt: "2026-02-24T12:00:00.000Z" },
    ]);
  });
});
