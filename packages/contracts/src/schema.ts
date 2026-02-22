import { z } from "zod";

export const FeedTypeSchema = z.enum(["text", "photo", "link"]);

export const MentionSchema = z.object({
  meetupId: z.string().min(1),
  pieceId: z.string().min(1),
  userId: z.string().min(1),
  createdAt: z.string().datetime().optional(),
});

export type FeedType = z.infer<typeof FeedTypeSchema>;
export type Mention = z.infer<typeof MentionSchema>;
