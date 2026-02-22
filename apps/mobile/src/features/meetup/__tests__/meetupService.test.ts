import {
  createPieceMention,
  fetchAttendanceStatus,
  upsertAttendanceStatus,
} from "../meetupService";
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

  it("returns attendance status when a row exists", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { is_attending: true },
      error: null,
    });
    const eqUser = jest.fn().mockReturnValue({ maybeSingle });
    const eqMeetup = jest.fn().mockReturnValue({ eq: eqUser });
    const select = jest.fn().mockReturnValue({ eq: eqMeetup });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const isAttending = await fetchAttendanceStatus("meetup-1", "user-1");

    expect(supabase.from).toHaveBeenCalledWith("meetup_attendance");
    expect(select).toHaveBeenCalledWith("is_attending");
    expect(eqMeetup).toHaveBeenCalledWith("meetup_id", "meetup-1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(isAttending).toBe(true);
  });

  it("upserts attendance status for current user", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({ upsert });

    await upsertAttendanceStatus("meetup-1", "user-1", false);

    expect(supabase.from).toHaveBeenCalledWith("meetup_attendance");
    expect(upsert).toHaveBeenCalledWith(
      {
        meetup_id: "meetup-1",
        user_id: "user-1",
        is_attending: false,
        checked_by: "user-1",
      },
      { onConflict: "meetup_id,user_id" },
    );
  });
});
