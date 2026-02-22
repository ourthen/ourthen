import { createPieceMention } from "../meetupService";
import { supabase } from "../../../lib/supabase";

jest.mock("../../../lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe("meetupService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a piece mention row", async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({ insert });

    await createPieceMention("meetup-1", "piece-1", "user-1");

    expect(supabase.from).toHaveBeenCalledWith("piece_mentions");
    expect(insert).toHaveBeenCalledWith({
      meetup_id: "meetup-1",
      piece_id: "piece-1",
      user_id: "user-1",
    });
  });

  it("ignores duplicate mention errors", async () => {
    const insert = jest.fn().mockResolvedValue({
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    });
    (supabase.from as jest.Mock).mockReturnValue({ insert });

    await expect(createPieceMention("meetup-1", "piece-1", "user-1")).resolves.toBeUndefined();
  });

  it("throws non-duplicate mention errors", async () => {
    const insert = jest.fn().mockResolvedValue({
      error: { code: "42501", message: "permission denied" },
    });
    (supabase.from as jest.Mock).mockReturnValue({ insert });

    await expect(createPieceMention("meetup-1", "piece-1", "user-1")).rejects.toEqual(
      expect.objectContaining({ message: "permission denied" }),
    );
  });
});
