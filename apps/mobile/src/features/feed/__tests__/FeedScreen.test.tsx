import { render, screen, waitFor } from "@testing-library/react-native";
import { FeedScreen } from "../FeedScreen";

describe("FeedScreen", () => {
  it("shows empty state when no feed items", async () => {
    const service = {
      fetchFeedItems: jest.fn().mockResolvedValue([]),
    };

    render(<FeedScreen circleId="circle-1" service={service} />);

    await waitFor(() => {
      expect(screen.getByText("아직 기록된 조각이 없어요.")).toBeTruthy();
    });
  });

  it("renders feed item cards", async () => {
    const service = {
      fetchFeedItems: jest.fn().mockResolvedValue([
        {
          id: "feed-1",
          body: "퇴근길에 본 노을",
          createdAt: "2026-02-22T00:00:00.000Z",
          authorId: "user-1",
        },
      ]),
    };

    render(<FeedScreen circleId="circle-1" service={service} />);

    await waitFor(() => {
      expect(screen.getByText("퇴근길에 본 노을")).toBeTruthy();
    });
  });
});
