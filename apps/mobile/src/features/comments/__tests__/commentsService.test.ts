import { createPieceComment, fetchPieceComments } from "../commentsService";
import { supabase } from "../../../lib/supabase";

jest.mock("../../../lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe("commentsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("trims comment body before saving", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: "c1", body: "안녕하세요", author_id: "u1", created_at: "2026-02-22T00:00:00.000Z" },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    (supabase.from as jest.Mock).mockReturnValue({ insert });

    await createPieceComment({
      pieceId: "p1",
      meetupId: "m1",
      authorId: "u1",
      body: "  안녕하세요  ",
    });

    expect(supabase.from).toHaveBeenCalledWith("piece_comments");
    expect(insert).toHaveBeenCalledWith({
      piece_id: "p1",
      meetup_id: "m1",
      author_id: "u1",
      body: "안녕하세요",
    });
  });

  it("rejects empty comment body", async () => {
    await expect(
      createPieceComment({
        pieceId: "p1",
        meetupId: "m1",
        authorId: "u1",
        body: "   ",
      }),
    ).rejects.toEqual(expect.objectContaining({ message: "댓글 내용을 입력해 주세요." }));
  });

  it("loads comments in oldest-first order", async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: "c1", body: "첫 댓글", author_id: "u1", created_at: "2026-02-22T00:00:00.000Z" }],
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const comments = await fetchPieceComments("p1");

    expect(supabase.from).toHaveBeenCalledWith("piece_comments");
    expect(select).toHaveBeenCalledWith("id, body, author_id, created_at");
    expect(eq).toHaveBeenCalledWith("piece_id", "p1");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(comments).toHaveLength(1);
    expect(comments[0].body).toBe("첫 댓글");
  });
});
