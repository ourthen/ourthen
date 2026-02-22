import { describe, expect, it } from "vitest";
import { PuzzleScoreInputSchema, computePuzzleStage } from "../src";

describe("computePuzzleStage", () => {
  it("returns stage 4 at score 8+", () => {
    const input = PuzzleScoreInputSchema.parse({ score: 8 });
    expect(computePuzzleStage(input.score)).toBe(4);
  });

  it("returns stage 0 at score 0", () => {
    const input = PuzzleScoreInputSchema.parse({ score: 0 });
    expect(computePuzzleStage(input.score)).toBe(0);
  });
});
