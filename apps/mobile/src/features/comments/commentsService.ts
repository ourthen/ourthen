import { supabase } from "../../lib/supabase";

export type PieceCommentItem = {
  id: string;
  body: string;
  authorId: string;
  createdAt: string;
};

type RawPieceCommentRow = {
  id: string;
  body: string;
  author_id: string;
  created_at: string;
};

export async function fetchPieceComments(pieceId: string): Promise<PieceCommentItem[]> {
  const { data, error } = await supabase
    .from("piece_comments")
    .select("id, body, author_id, created_at")
    .eq("piece_id", pieceId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data as RawPieceCommentRow[]) ?? []).map((row) => ({
    id: row.id,
    body: row.body,
    authorId: row.author_id,
    createdAt: row.created_at,
  }));
}

type CreatePieceCommentInput = {
  pieceId: string;
  meetupId?: string;
  authorId: string;
  body: string;
};

export async function createPieceComment(
  input: CreatePieceCommentInput,
): Promise<PieceCommentItem> {
  const trimmedBody = input.body.trim();
  if (!trimmedBody) {
    throw new Error("댓글 내용을 입력해 주세요.");
  }

  const { data, error } = await supabase
    .from("piece_comments")
    .insert({
      piece_id: input.pieceId,
      meetup_id: input.meetupId,
      author_id: input.authorId,
      body: trimmedBody,
    })
    .select("id, body, author_id, created_at")
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    body: data.body,
    authorId: data.author_id,
    createdAt: data.created_at,
  };
}
