import { z } from "zod";

export const PuzzleScoreInputSchema = z.object({
  score: z.number().nonnegative(),
});

export function computePuzzleStage(score: number): 0 | 1 | 2 | 3 | 4 {
  if (score >= 8) return 4;
  if (score >= 5) return 3;
  if (score >= 3) return 2;
  if (score >= 1) return 1;
  return 0;
}
