import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { CircleHomeScreen } from "../CircleHomeScreen";

const createServiceMock = () => ({
  fetchMyCircles: jest.fn(),
  fetchMeetupsByCircle: jest.fn(),
  fetchPiecesByCircle: jest.fn(),
  createCircleWithMembership: jest.fn(),
  createMeetup: jest.fn(),
  createTextPiece: jest.fn(),
});

describe("CircleHomeScreen", () => {
  it("shows create-circle state when user has no circles", async () => {
    const service = createServiceMock();
    service.fetchMyCircles.mockResolvedValue([]);

    render(<CircleHomeScreen userId="user-1" service={service} />);

    await waitFor(() => {
      expect(screen.getByText("참여한 모임이 아직 없어요.")).toBeTruthy();
      expect(screen.getByPlaceholderText("모임 이름")).toBeTruthy();
    });
  });

  it("shows meetup cards when circle data exists", async () => {
    const service = createServiceMock();
    service.fetchMyCircles.mockResolvedValue([{ id: "c1", name: "우리 모임", role: "admin" }]);
    service.fetchMeetupsByCircle.mockResolvedValue([
      { id: "m1", title: "금요일 저녁 모임", status: "planned" },
    ]);
    service.fetchPiecesByCircle.mockResolvedValue([{ id: "p1", label: "첫 기억" }]);

    render(<CircleHomeScreen userId="user-1" service={service} />);

    await waitFor(() => {
      expect(screen.getAllByText("우리 모임").length).toBeGreaterThan(0);
      expect(screen.getByText("금요일 저녁 모임")).toBeTruthy();
      expect(screen.getAllByText("첫 기억").length).toBeGreaterThan(0);
    });
  });

  it("calls onSignOut when logout button is pressed", async () => {
    const service = createServiceMock();
    service.fetchMyCircles.mockResolvedValue([]);
    const onSignOut = jest.fn().mockResolvedValue(undefined);

    render(<CircleHomeScreen userId="user-1" service={service} onSignOut={onSignOut} />);

    await waitFor(() => {
      expect(screen.getByText("참여한 모임이 아직 없어요.")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("로그아웃"));

    await waitFor(() => {
      expect(onSignOut).toHaveBeenCalledTimes(1);
    });
  });
});
