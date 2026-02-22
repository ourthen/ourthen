import { createCircleWithMembership, mapCircleRows } from "../circleService";
import { supabase } from "../../../lib/supabase";

jest.mock("../../../lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
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

  it("creates circle and self membership", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: "circle-1", name: "새 모임" },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ single });
    const circleInsert = jest.fn().mockReturnValue({ select });
    const memberInsert = jest.fn().mockResolvedValue({ error: null });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "circles") {
        return { insert: circleInsert };
      }
      if (table === "circle_members") {
        return { insert: memberInsert };
      }
      return {};
    });

    const created = await createCircleWithMembership("  새 모임  ", "user-1");

    expect(circleInsert).toHaveBeenCalledWith({
      name: "새 모임",
      created_by: "user-1",
    });
    expect(memberInsert).toHaveBeenCalledWith({
      circle_id: "circle-1",
      user_id: "user-1",
      role: "admin",
    });
    expect(created).toEqual({ id: "circle-1", name: "새 모임", role: "admin" });
  });

  it("rejects blank circle names", async () => {
    await expect(createCircleWithMembership("   ", "user-1")).rejects.toEqual(
      expect.objectContaining({ message: "모임 이름을 입력해 주세요." }),
    );
  });
});
