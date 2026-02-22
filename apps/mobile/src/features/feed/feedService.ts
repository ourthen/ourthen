import { supabase } from "../../lib/supabase";

export type FeedItemSummary = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
};

type RawFeedRow = {
  id: string;
  body: string | null;
  created_at: string;
  author_id: string;
};

export async function fetchFeedItems(circleId: string): Promise<FeedItemSummary[]> {
  const { data, error } = await supabase
    .from("feed_items")
    .select("id, body, created_at, author_id")
    .eq("circle_id", circleId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    throw error;
  }

  return ((data as RawFeedRow[]) ?? [])
    .filter((row) => (row.body ?? "").trim().length > 0)
    .map((row) => ({
      id: row.id,
      body: (row.body ?? "").trim(),
      createdAt: row.created_at,
      authorId: row.author_id,
    }));
}
