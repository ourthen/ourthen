import { supabase } from "../../lib/supabase";

export async function fetchMentionedPieceIds(meetupId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("piece_mentions")
    .select("piece_id")
    .eq("meetup_id", meetupId);

  if (error) {
    throw error;
  }

  return new Set(
    ((data as Array<{ piece_id: string }> | null) ?? []).map((row) => row.piece_id),
  );
}

export async function createPieceMention(
  meetupId: string,
  pieceId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from("piece_mentions").insert({
    meetup_id: meetupId,
    piece_id: pieceId,
    user_id: userId,
  });

  if (error && error.code !== "23505") {
    throw error;
  }
}
