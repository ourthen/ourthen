import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { CircleHomeScreen } from "../CircleHomeScreen";

const createServiceMock = () => ({
  fetchMyCircles: jest.fn().mockResolvedValue([]),
  fetchMeetupsByCircle: jest.fn().mockResolvedValue([]),
  fetchCircleMembers: jest.fn().mockResolvedValue([]),
  fetchPiecesByCircle: jest.fn().mockResolvedValue([]),
  createCircleWithMembership: jest.fn(),
  createCircleInviteCode: jest.fn(),
  fetchLatestCircleInviteCode: jest.fn().mockResolvedValue(null),
  joinCircleByInviteCode: jest.fn(),
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
    service.fetchCircleMembers.mockResolvedValue([
      { userId: "user-1", role: "admin", joinedAt: "2026-02-23T12:00:00.000Z" },
    ]);
    service.fetchPiecesByCircle.mockResolvedValue([{ id: "p1", label: "첫 기억" }]);

    render(<CircleHomeScreen userId="user-1" service={service} />);

    await waitFor(() => {
      expect(screen.getAllByText("우리 모임").length).toBeGreaterThan(0);
      expect(screen.getByText("모임 멤버 · 우리 모임")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("일정"));

    await waitFor(() => {
      expect(screen.getByText("금요일 저녁 모임")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("모임"));

    await waitFor(() => {
      expect(screen.getByText("모임 멤버 · 우리 모임")).toBeTruthy();
      expect(screen.getByText("나")).toBeTruthy();
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

  it("joins a circle using invite code from empty state", async () => {
    const service = createServiceMock();
    service.fetchMyCircles.mockResolvedValue([]);
    service.joinCircleByInviteCode.mockResolvedValue({
      id: "c2",
      name: "우리 동네 팀",
      role: "member",
    });
    service.fetchMeetupsByCircle.mockResolvedValue([]);
    service.fetchCircleMembers.mockResolvedValue([
      { userId: "user-1", role: "member", joinedAt: "2026-02-23T12:00:00.000Z" },
    ]);
    service.fetchPiecesByCircle.mockResolvedValue([]);

    render(<CircleHomeScreen userId="user-1" service={service} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("모임 이름")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("코드 참여"));
    fireEvent.changeText(
      screen.getByPlaceholderText("참여 코드 입력 (예: ABCD-1234)"),
      "abcd-1234",
    );
    fireEvent.press(screen.getByText("코드로 참여하기"));

    await waitFor(() => {
      expect(service.joinCircleByInviteCode).toHaveBeenCalledWith("ABCD1234");
      expect(service.fetchMeetupsByCircle).toHaveBeenCalledWith("c2");
      expect(service.fetchCircleMembers).toHaveBeenCalledWith("c2");
      expect(service.fetchPiecesByCircle).toHaveBeenCalledWith("c2");
      expect(screen.getAllByText("우리 동네 팀").length).toBeGreaterThan(0);
      expect(screen.getByText("모임에 참여했어요.")).toBeTruthy();
      expect(screen.getByText("참여 완료! 첫 조각을 남겨볼까요?")).toBeTruthy();
      expect(screen.getByText("첫 조각 작성하기")).toBeTruthy();
    });
  });

  it("hides invite code generation controls for non-admin members", async () => {
    const service = createServiceMock();
    service.fetchMyCircles.mockResolvedValue([{ id: "c1", name: "동네 친구", role: "member" }]);
    service.fetchMeetupsByCircle.mockResolvedValue([]);
    service.fetchCircleMembers.mockResolvedValue([
      { userId: "user-1", role: "member", joinedAt: "2026-02-23T12:00:00.000Z" },
    ]);
    service.fetchPiecesByCircle.mockResolvedValue([]);

    render(<CircleHomeScreen userId="user-1" service={service} />);

    await waitFor(() => {
      expect(screen.getAllByText("동네 친구").length).toBeGreaterThan(0);
    });

    fireEvent.press(screen.getByText("초대"));

    await waitFor(() => {
      expect(screen.getByText("현재 계정은 멤버 권한이라 초대 코드를 만들 수 없어요.")).toBeTruthy();
    });

    expect(screen.queryByText("초대 코드 발급하기")).toBeNull();
    expect(screen.queryByText("새 코드 다시 발급")).toBeNull();
  });

  it("does not show first-piece nudge when joined circle already has pieces", async () => {
    const service = createServiceMock();
    service.fetchMyCircles.mockResolvedValue([]);
    service.joinCircleByInviteCode.mockResolvedValue({
      id: "c2",
      name: "우리 동네 팀",
      role: "member",
    });
    service.fetchMeetupsByCircle.mockResolvedValue([]);
    service.fetchCircleMembers.mockResolvedValue([
      { userId: "user-1", role: "member", joinedAt: "2026-02-23T12:00:00.000Z" },
    ]);
    service.fetchPiecesByCircle.mockResolvedValue([{ id: "p1", label: "이미 있던 조각" }]);

    render(<CircleHomeScreen userId="user-1" service={service} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("모임 이름")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("코드 참여"));
    fireEvent.changeText(
      screen.getByPlaceholderText("참여 코드 입력 (예: ABCD-1234)"),
      "abcd-1234",
    );
    fireEvent.press(screen.getByText("코드로 참여하기"));

    await waitFor(() => {
      expect(service.joinCircleByInviteCode).toHaveBeenCalledWith("ABCD1234");
      expect(screen.queryByText("참여 완료! 첫 조각을 남겨볼까요?")).toBeNull();
    });
  });

  it("loads latest invite code for admin circles", async () => {
    const service = createServiceMock();
    service.fetchMyCircles.mockResolvedValue([{ id: "c1", name: "우리 모임", role: "admin" }]);
    service.fetchMeetupsByCircle.mockResolvedValue([]);
    service.fetchCircleMembers.mockResolvedValue([
      { userId: "user-1", role: "admin", joinedAt: "2026-02-23T12:00:00.000Z" },
    ]);
    service.fetchPiecesByCircle.mockResolvedValue([]);
    service.fetchLatestCircleInviteCode.mockResolvedValue("ZXCV1234");

    render(<CircleHomeScreen userId="user-1" service={service} />);

    await waitFor(() => {
      expect(screen.getAllByText("우리 모임").length).toBeGreaterThan(0);
    });

    fireEvent.press(screen.getByText("초대"));

    await waitFor(() => {
      expect(service.fetchLatestCircleInviteCode).toHaveBeenCalledWith("c1");
      expect(screen.getByText("ZXCV-1234")).toBeTruthy();
    });
  });

  it("requires confirmation before rotating an existing invite code", async () => {
    const service = createServiceMock();
    service.fetchMyCircles.mockResolvedValue([{ id: "c1", name: "우리 모임", role: "admin" }]);
    service.fetchMeetupsByCircle.mockResolvedValue([]);
    service.fetchCircleMembers.mockResolvedValue([
      { userId: "user-1", role: "admin", joinedAt: "2026-02-23T12:00:00.000Z" },
    ]);
    service.fetchPiecesByCircle.mockResolvedValue([]);
    service.fetchLatestCircleInviteCode.mockResolvedValue("ZXCV1234");
    service.createCircleInviteCode.mockResolvedValue("QWER5678");

    render(<CircleHomeScreen userId="user-1" service={service} />);

    await waitFor(() => {
      expect(screen.getAllByText("우리 모임").length).toBeGreaterThan(0);
    });

    fireEvent.press(screen.getByText("초대"));

    await waitFor(() => {
      expect(screen.getByText("새 코드 다시 발급")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("새 코드 다시 발급"));

    await waitFor(() => {
      expect(screen.getByText("새 코드를 발급하면 이전 코드가 만료돼요. 계속할까요?")).toBeTruthy();
      expect(screen.getByText("새 코드 발급 진행")).toBeTruthy();
      expect(service.createCircleInviteCode).toHaveBeenCalledTimes(0);
    });

    fireEvent.press(screen.getByText("새 코드 발급 진행"));

    await waitFor(() => {
      expect(service.createCircleInviteCode).toHaveBeenCalledWith("c1");
      expect(screen.getByText("QWER-5678")).toBeTruthy();
    });
  });

  it("refreshes circle data when refresh button is pressed", async () => {
    const service = createServiceMock();
    service.fetchMyCircles
      .mockResolvedValueOnce([{ id: "c1", name: "우리 모임", role: "admin" }])
      .mockResolvedValueOnce([{ id: "c1", name: "우리 모임", role: "admin" }]);
    service.fetchMeetupsByCircle.mockResolvedValue([]);
    service.fetchCircleMembers.mockResolvedValue([]);
    service.fetchPiecesByCircle.mockResolvedValue([]);

    render(<CircleHomeScreen userId="user-1" service={service} />);

    await waitFor(() => {
      expect(screen.getAllByText("우리 모임").length).toBeGreaterThan(0);
    });

    fireEvent.press(screen.getByText("새로고침"));

    await waitFor(() => {
      expect(service.fetchMyCircles).toHaveBeenCalledTimes(2);
    });
  });

  it("shows one focus panel at a time in home tab", async () => {
    const service = createServiceMock();
    service.fetchMyCircles.mockResolvedValue([{ id: "c1", name: "우리 모임", role: "admin" }]);
    service.fetchMeetupsByCircle.mockResolvedValue([]);
    service.fetchCircleMembers.mockResolvedValue([
      { userId: "user-1", role: "admin", joinedAt: "2026-02-23T12:00:00.000Z" },
    ]);
    service.fetchPiecesByCircle.mockResolvedValue([]);

    render(<CircleHomeScreen userId="user-1" service={service} />);

    await waitFor(() => {
      expect(screen.getByText("모임 멤버 · 우리 모임")).toBeTruthy();
    });

    expect(screen.queryByText("초대 코드 발급하기")).toBeNull();

    fireEvent.press(screen.getByText("기억"));

    await waitFor(() => {
      expect(screen.getByText("기억 조각 추가 · 우리 모임")).toBeTruthy();
      expect(screen.queryByText("초대 코드 발급하기")).toBeNull();
    });

    fireEvent.press(screen.getByText("초대"));

    await waitFor(() => {
      expect(screen.getByText("초대 코드 발급하기")).toBeTruthy();
      expect(screen.queryByText("기억 조각 추가 · 우리 모임")).toBeNull();
    });
  });

  it("shows retry action when initial load fails", async () => {
    const service = createServiceMock();
    service.fetchMyCircles
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockResolvedValueOnce([]);
    service.fetchMeetupsByCircle.mockResolvedValue([]);
    service.fetchPiecesByCircle.mockResolvedValue([]);

    render(<CircleHomeScreen userId="user-1" service={service} />);

    await waitFor(() => {
      expect(
        screen.getByText("네트워크가 불안정해요. 연결을 확인한 뒤 다시 시도해 주세요."),
      ).toBeTruthy();
      expect(screen.getByText("다시 시도")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("다시 시도"));

    await waitFor(() => {
      expect(service.fetchMyCircles).toHaveBeenCalledTimes(2);
    });
  });
});
