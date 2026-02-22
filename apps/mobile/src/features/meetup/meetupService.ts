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

export async function fetchAttendanceStatus(
  meetupId: string,
  userId: string,
): Promise<boolean | null> {
  const { data, error } = await supabase
    .from("meetup_attendance")
    .select("is_attending")
    .eq("meetup_id", meetupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.is_attending ?? null;
}

export async function upsertAttendanceStatus(
  meetupId: string,
  userId: string,
  isAttending: boolean,
): Promise<void> {
  const { error } = await supabase.from("meetup_attendance").upsert(
    {
      meetup_id: meetupId,
      user_id: userId,
      is_attending: isAttending,
      checked_by: userId,
    },
    { onConflict: "meetup_id,user_id" },
  );

  if (error) {
    throw error;
  }
}
