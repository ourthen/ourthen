import { fetchFeedItems } from "../feedService";
import { supabase } from "../../../lib/supabase";

jest.mock("../../../lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe("feedService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads recent feed items for a circle", async () => {
    const limit = jest.fn().mockResolvedValue({
      data: [
        {
          id: "f1",
          body: "주말에 같이 본 영화",
          created_at: "2026-02-22T00:00:00.000Z",
          author_id: "u1",
        },
      ],
      error: null,
    });
    const order = jest.fn().mockReturnValue({ limit });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const items = await fetchFeedItems("circle-1");

    expect(supabase.from).toHaveBeenCalledWith("feed_items");
    expect(select).toHaveBeenCalledWith("id, body, created_at, author_id");
    expect(eq).toHaveBeenCalledWith("circle_id", "circle-1");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(30);
    expect(items[0].body).toBe("주말에 같이 본 영화");
  });
});
