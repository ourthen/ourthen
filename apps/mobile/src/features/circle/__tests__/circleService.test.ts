import { createCircleWithMembership, mapCircleRows } from "../circleService";
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
});
