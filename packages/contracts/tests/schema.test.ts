import { describe, expect, it } from "vitest";
import { MentionSchema } from "../src";

describe("MentionSchema", () => {
  it("accepts mentioned-only relation", () => {
    const parsed = MentionSchema.parse({
      meetupId: "m1",
      pieceId: "p1",
      userId: "u1",
    });

    expect(parsed.meetupId).toBe("m1");
    expect(parsed.pieceId).toBe("p1");
    expect(parsed.userId).toBe("u1");
  });
});
