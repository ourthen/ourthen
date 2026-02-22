import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useResponsiveLayout } from "../../core/ui/layout";
import { colors, radii } from "../../core/ui/tokens";
import { FeedScreen } from "../feed/FeedScreen";
import { MeetupDetailScreen } from "../meetup/MeetupDetailScreen";
import { PuzzleCard } from "../puzzle/PuzzleCard";
import * as circleService from "./circleService";

type CircleHomeService = {
  fetchMyCircles: typeof circleService.fetchMyCircles;
  fetchMeetupsByCircle: typeof circleService.fetchMeetupsByCircle;
  fetchCircleMembers: typeof circleService.fetchCircleMembers;
  fetchPiecesByCircle: typeof circleService.fetchPiecesByCircle;
  createCircleWithMembership: typeof circleService.createCircleWithMembership;
  createCircleInviteCode: typeof circleService.createCircleInviteCode;
  fetchLatestCircleInviteCode: typeof circleService.fetchLatestCircleInviteCode;
  joinCircleByInviteCode: typeof circleService.joinCircleByInviteCode;
  createMeetup: typeof circleService.createMeetup;
  createTextPiece: typeof circleService.createTextPiece;
};

type CircleHomeScreenProps = {
  onSignOut?: () => Promise<void> | void;
  userId: string;
  service?: CircleHomeService;
};

const defaultService: CircleHomeService = {
  fetchMyCircles: circleService.fetchMyCircles,
  fetchMeetupsByCircle: circleService.fetchMeetupsByCircle,
  fetchCircleMembers: circleService.fetchCircleMembers,
  fetchPiecesByCircle: circleService.fetchPiecesByCircle,
  createCircleWithMembership: circleService.createCircleWithMembership,
  createCircleInviteCode: circleService.createCircleInviteCode,
  fetchLatestCircleInviteCode: circleService.fetchLatestCircleInviteCode,
  joinCircleByInviteCode: circleService.joinCircleByInviteCode,
  createMeetup: circleService.createMeetup,
  createTextPiece: circleService.createTextPiece,
};

type BusyAction =
  | "create_circle"
  | "join_circle"
  | "create_invite"
  | "share_invite"
  | "create_meetup"
  | "create_piece";

type HomeFocusPanel = "pieces" | "invite" | "meetup" | "members";

function normalizeInviteCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

function formatInviteCode(input: string): string {
  const normalized = normalizeInviteCode(input);
  if (normalized.length <= 4) {
    return normalized;
  }
  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
}

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof Error && /fetch|network/i.test(error.message)) {
    return "네트워크가 불안정해요. 연결을 확인한 뒤 다시 시도해 주세요.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}

export function CircleHomeScreen({
  userId,
  service = defaultService,
  onSignOut,
}: CircleHomeScreenProps) {
  const layout = useResponsiveLayout();
  const [circles, setCircles] = useState<circleService.CircleSummary[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [meetups, setMeetups] = useState<circleService.MeetupSummary[]>([]);
  const [members, setMembers] = useState<circleService.CircleMemberSummary[]>([]);
  const [pieces, setPieces] = useState<circleService.PieceSummary[]>([]);
  const [circleName, setCircleName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [meetupTitle, setMeetupTitle] = useState("");
  const [pieceBody, setPieceBody] = useState("");
  const [activeTab, setActiveTab] = useState<"home" | "feed">("home");
  const [homeFocusPanel, setHomeFocusPanel] = useState<HomeFocusPanel>("pieces");
  const [emptyStateMode, setEmptyStateMode] = useState<"create" | "join">("create");
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedRefreshToken, setFeedRefreshToken] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showFirstPieceNudge, setShowFirstPieceNudge] = useState(false);
  const [isInviteRotateConfirming, setIsInviteRotateConfirming] = useState(false);
  const pieceInputRef = useRef<TextInput | null>(null);

  const selectedCircle = useMemo(
    () => circles.find((circle) => circle.id === selectedCircleId) ?? null,
    [circles, selectedCircleId],
  );
  const orderedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.userId === userId && b.userId !== userId) {
        return -1;
      }
      if (b.userId === userId && a.userId !== userId) {
        return 1;
      }
      if (a.role === "admin" && b.role !== "admin") {
        return -1;
      }
      if (b.role === "admin" && a.role !== "admin") {
        return 1;
      }
      return (a.joinedAt ?? "").localeCompare(b.joinedAt ?? "");
    });
  }, [members, userId]);
  const isBusy = busyAction !== null;
  const isActionBusy = useCallback(
    (action: BusyAction) => busyAction === action,
    [busyAction],
  );

  const loadCircleContent = useCallback(
    async (circleId: string) => {
      const [nextMeetups, nextMembers, nextPieces] = await Promise.all([
        service.fetchMeetupsByCircle(circleId),
        service.fetchCircleMembers(circleId),
        service.fetchPiecesByCircle(circleId),
      ]);

      setMeetups(nextMeetups);
      setMembers(nextMembers);
      setPieces(nextPieces);
      return {
        meetups: nextMeetups,
        members: nextMembers,
        pieces: nextPieces,
      };
    },
    [service],
  );

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const fetchedCircles = await service.fetchMyCircles(userId);
      setCircles(fetchedCircles);
      const nextCircleId = fetchedCircles[0]?.id ?? null;
      setSelectedCircleId(nextCircleId);

      if (nextCircleId) {
        await loadCircleContent(nextCircleId);
      } else {
        setMeetups([]);
        setMembers([]);
        setPieces([]);
      }
    } catch (error) {
      setErrorMessage(messageFromError(error, "모임 정보를 불러오지 못했어요."));
    } finally {
      setIsLoading(false);
    }
  }, [loadCircleContent, service, userId]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setSuccessMessage("");
    }, 2200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [successMessage]);

  useEffect(() => {
    if (!selectedCircle || selectedCircle.role !== "admin") {
      return;
    }

    let isMounted = true;

    const loadLatestInviteCode = async () => {
      try {
        const latestCode = await service.fetchLatestCircleInviteCode(selectedCircle.id);
        if (isMounted && latestCode) {
          setInviteCode(latestCode);
        }
      } catch {
        if (isMounted) {
          setInviteCode("");
        }
      }
    };

    void loadLatestInviteCode();

    return () => {
      isMounted = false;
    };
  }, [selectedCircle, service]);

  const handleSelectCircle = async (circleId: string) => {
    setInviteCode("");
    setIsInviteRotateConfirming(false);
    setShowFirstPieceNudge(false);
    setHomeFocusPanel("pieces");
    setSelectedCircleId(circleId);
    try {
      setErrorMessage("");
      await loadCircleContent(circleId);
    } catch (error) {
      setErrorMessage(messageFromError(error, "모임 데이터를 새로고침하지 못했어요."));
    }
  };

  const handleCreateCircle = async () => {
    try {
      setBusyAction("create_circle");
      setErrorMessage("");
      setSuccessMessage("");
      setShowFirstPieceNudge(false);
      setIsInviteRotateConfirming(false);
      const created = await service.createCircleWithMembership(circleName);
      setCircleName("");
      setInviteCode("");
      setCircles((prev) => [created, ...prev]);
      setSelectedCircleId(created.id);
      await loadCircleContent(created.id);
      setSuccessMessage("모임을 만들었어요.");
    } catch (error) {
      setSuccessMessage("");
      setErrorMessage(messageFromError(error, "모임 만들기에 실패했어요."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateInviteCode = async () => {
    if (!selectedCircleId) {
      return;
    }

    if (inviteCode && !isInviteRotateConfirming) {
      setErrorMessage("");
      setSuccessMessage("새 코드를 발급하면 이전 코드가 만료돼요. 계속할까요?");
      setIsInviteRotateConfirming(true);
      return;
    }

    try {
      setBusyAction("create_invite");
      setErrorMessage("");
      setSuccessMessage("");
      const hadInviteCode = inviteCode.trim().length > 0;
      const code = await service.createCircleInviteCode(selectedCircleId);
      setInviteCode(code);
      setSuccessMessage(
        hadInviteCode
          ? "새 코드를 발급했어요. 이전 코드는 만료됐어요."
          : "초대 코드를 발급했어요.",
      );
      setIsInviteRotateConfirming(false);
    } catch (error) {
      setSuccessMessage("");
      setErrorMessage(messageFromError(error, "초대 코드 생성에 실패했어요."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleJoinByCode = async () => {
    try {
      setBusyAction("join_circle");
      setErrorMessage("");
      setSuccessMessage("");
      setShowFirstPieceNudge(false);
      const joinedCircle = await service.joinCircleByInviteCode(joinCode);
      setJoinCode("");
      setActiveTab("home");
      setHomeFocusPanel("pieces");
      setInviteCode("");
      setIsInviteRotateConfirming(false);
      setCircles((prev) => [joinedCircle, ...prev.filter((row) => row.id !== joinedCircle.id)]);
      setSelectedCircleId(joinedCircle.id);
      const circleContent = await loadCircleContent(joinedCircle.id);
      const shouldNudgeFirstPiece = circleContent.pieces.length === 0;
      setShowFirstPieceNudge(shouldNudgeFirstPiece);
      if (shouldNudgeFirstPiece) {
        setTimeout(() => {
          pieceInputRef.current?.focus();
        }, 80);
      }
      setSuccessMessage("모임에 참여했어요.");
    } catch (error) {
      setSuccessMessage("");
      setErrorMessage(messageFromError(error, "참여 코드로 모임에 들어가지 못했어요."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleShareInviteCode = async () => {
    if (!selectedCircle || !inviteCode) {
      return;
    }

    try {
      setBusyAction("share_invite");
      setErrorMessage("");
      setSuccessMessage("");
      const result = await Share.share({
        message: `[우리그때] ${selectedCircle.name} 초대 코드: ${formatInviteCode(inviteCode)}\n앱에서 코드로 참여해 주세요.`,
      });
      if (result.action === Share.sharedAction) {
        setSuccessMessage("초대 코드를 공유했어요.");
      }
    } catch (error) {
      setSuccessMessage("");
      setErrorMessage(messageFromError(error, "초대 코드 공유에 실패했어요."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateMeetup = async () => {
    if (!selectedCircleId) {
      return;
    }

    try {
      setBusyAction("create_meetup");
      setErrorMessage("");
      setSuccessMessage("");
      await service.createMeetup(selectedCircleId, userId, meetupTitle);
      setMeetupTitle("");
      await loadCircleContent(selectedCircleId);
      setSuccessMessage("모임 일정을 추가했어요.");
    } catch (error) {
      setSuccessMessage("");
      setErrorMessage(messageFromError(error, "모임 생성에 실패했어요."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreatePiece = async () => {
    if (!selectedCircleId) {
      return;
    }

    try {
      setBusyAction("create_piece");
      setErrorMessage("");
      setSuccessMessage("");
      await service.createTextPiece(selectedCircleId, userId, pieceBody);
      setPieceBody("");
      await loadCircleContent(selectedCircleId);
      setFeedRefreshToken((prev) => prev + 1);
      setShowFirstPieceNudge(false);
      setSuccessMessage("기억 조각을 저장했어요.");
    } catch (error) {
      setSuccessMessage("");
      setErrorMessage(messageFromError(error, "기억 조각 저장에 실패했어요."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleSignOut = async () => {
    if (!onSignOut) {
      return;
    }

    try {
      setIsSigningOut(true);
      setErrorMessage("");
      setSuccessMessage("");
      await onSignOut();
    } catch (error) {
      setErrorMessage(messageFromError(error, "로그아웃에 실패했어요."));
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setErrorMessage("");
      setSuccessMessage("");
      setShowFirstPieceNudge(false);
      setIsInviteRotateConfirming(false);
      await loadInitialData();
      setFeedRefreshToken((prev) => prev + 1);
    } catch (error) {
      setErrorMessage(messageFromError(error, "모임 정보를 새로고침하지 못했어요."));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStartFirstPiece = () => {
    setShowFirstPieceNudge(false);
    setActiveTab("home");
    setHomeFocusPanel("pieces");
    setTimeout(() => {
      pieceInputRef.current?.focus();
    }, 40);
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingHorizontal: layout.horizontalPadding,
        },
      ]}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      onScrollBeginDrag={Keyboard.dismiss}
      refreshControl={
        <RefreshControl
          onRefresh={() => {
            void handleRefresh();
          }}
          refreshing={isRefreshing}
          tintColor={colors.primary}
        />
      }
    >
      <View style={[styles.content, { maxWidth: layout.contentMaxWidth }]}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroTitle}>우리그때 홈</Text>
            <View style={styles.heroActionRow}>
              <Pressable
                accessibilityRole="button"
                disabled={isRefreshing || isBusy}
                onPress={() => {
                  void handleRefresh();
                }}
                style={({ pressed }) => [
                  styles.refreshButton,
                  (isRefreshing || isBusy) && styles.refreshButtonDisabled,
                  pressed && !(isRefreshing || isBusy) && styles.refreshButtonPressed,
                ]}
              >
                <Text style={styles.refreshButtonText}>{isRefreshing ? "갱신 중..." : "새로고침"}</Text>
              </Pressable>
              {onSignOut ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={isSigningOut || isBusy}
                  onPress={() => {
                    void handleSignOut();
                  }}
                  style={({ pressed }) => [
                    styles.logoutButton,
                    (isSigningOut || isBusy) && styles.logoutButtonDisabled,
                    pressed && !(isSigningOut || isBusy) && styles.logoutButtonPressed,
                  ]}
                >
                  <Text style={styles.logoutButtonText}>
                    {isSigningOut ? "로그아웃 중..." : "로그아웃"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          <Text style={styles.heroBody}>
            오늘은 지난 순간을 한 조각씩 꺼내고, 모임에서 이어질 이야기를 준비해보세요.
          </Text>
          <View style={styles.tabRow}>
            <Pressable
              onPress={() => setActiveTab("home")}
              style={[styles.tabButton, activeTab === "home" && styles.tabButtonActive]}
            >
              <Text
                style={[styles.tabButtonText, activeTab === "home" && styles.tabButtonTextActive]}
              >
                홈
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab("feed")}
              style={[styles.tabButton, activeTab === "feed" && styles.tabButtonActive]}
            >
              <Text
                style={[styles.tabButtonText, activeTab === "feed" && styles.tabButtonTextActive]}
              >
                피드
              </Text>
            </Pressable>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.mutedText}>모임 데이터를 불러오는 중...</Text>
          </View>
        ) : null}

        {!isLoading && !selectedCircle ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>시작하기</Text>
            <Text style={styles.emptyStateTitle}>참여한 모임이 아직 없어요.</Text>
            <Text style={styles.mutedText}>한 번에 하나씩, 모임을 만들거나 코드로 참여해 보세요.</Text>
            <View style={styles.emptyModeRow}>
              <Pressable
                onPress={() => {
                  setEmptyStateMode("create");
                  setErrorMessage("");
                }}
                style={[
                  styles.emptyModeButton,
                  emptyStateMode === "create" && styles.emptyModeButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.emptyModeButtonText,
                    emptyStateMode === "create" && styles.emptyModeButtonTextActive,
                  ]}
                >
                  모임 만들기
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setEmptyStateMode("join");
                  setErrorMessage("");
                }}
                style={[
                  styles.emptyModeButton,
                  emptyStateMode === "join" && styles.emptyModeButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.emptyModeButtonText,
                    emptyStateMode === "join" && styles.emptyModeButtonTextActive,
                  ]}
                >
                  코드 참여
                </Text>
              </Pressable>
            </View>

            {emptyStateMode === "create" ? (
              <>
                <TextInput
                  onChangeText={setCircleName}
                  placeholder="모임 이름"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  value={circleName}
                />
                <Pressable
                  disabled={isBusy || circleName.trim().length === 0}
                  onPress={handleCreateCircle}
                  style={({ pressed }) => [
                    styles.actionButton,
                    (isBusy || circleName.trim().length === 0) && styles.actionButtonDisabled,
                    pressed &&
                      !(isBusy || circleName.trim().length === 0) &&
                      styles.actionButtonPressed,
                  ]}
                >
                  <Text style={styles.actionButtonText}>
                    {isActionBusy("create_circle") ? "생성 중..." : "모임 만들기"}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <TextInput
                  autoCapitalize="characters"
                  onChangeText={(next) => {
                    setJoinCode(normalizeInviteCode(next));
                  }}
                  placeholder="참여 코드 입력 (예: ABCD-1234)"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  value={formatInviteCode(joinCode)}
                />
                <Pressable
                  disabled={isBusy || joinCode.trim().length === 0}
                  onPress={handleJoinByCode}
                  style={({ pressed }) => [
                    styles.actionButton,
                    (isBusy || joinCode.trim().length === 0) && styles.actionButtonDisabled,
                    pressed &&
                      !(isBusy || joinCode.trim().length === 0) &&
                      styles.actionButtonPressed,
                  ]}
                >
                  <Text style={styles.actionButtonText}>
                    {isActionBusy("join_circle") ? "참여 중..." : "코드로 참여하기"}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        ) : null}

        {!isLoading && selectedCircle && activeTab === "home" ? (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>내 모임</Text>
              <View style={styles.circleTitleRow}>
                <Text style={styles.circleTitle}>{selectedCircle.name}</Text>
                <View
                  style={[
                    styles.roleBadge,
                    selectedCircle.role === "admin" ? styles.roleBadgeAdmin : styles.roleBadgeMember,
                  ]}
                >
                  <Text style={styles.roleBadgeText}>
                    {selectedCircle.role === "admin" ? "관리자" : "멤버"}
                  </Text>
                </View>
              </View>
              <View style={styles.circleChipRow}>
                {circles.map((circle) => (
                  <Pressable
                    key={circle.id}
                    onPress={() => {
                      void handleSelectCircle(circle.id);
                    }}
                    style={[
                      styles.circleChip,
                      circle.id === selectedCircleId && styles.circleChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.circleChipText,
                        circle.id === selectedCircleId && styles.circleChipTextActive,
                      ]}
                    >
                      {circle.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.memberSummaryRow}>
                <Text style={styles.memberSummaryText}>
                  멤버 {members.length}명
                </Text>
              </View>
            </View>

            <View style={styles.focusTabRow}>
              <Pressable
                onPress={() => setHomeFocusPanel("pieces")}
                style={[
                  styles.focusTabButton,
                  homeFocusPanel === "pieces" && styles.focusTabButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.focusTabButtonText,
                    homeFocusPanel === "pieces" && styles.focusTabButtonTextActive,
                  ]}
                >
                  기억 조각
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setHomeFocusPanel("invite")}
                style={[
                  styles.focusTabButton,
                  homeFocusPanel === "invite" && styles.focusTabButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.focusTabButtonText,
                    homeFocusPanel === "invite" && styles.focusTabButtonTextActive,
                  ]}
                >
                  초대/참여
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setHomeFocusPanel("meetup")}
                style={[
                  styles.focusTabButton,
                  homeFocusPanel === "meetup" && styles.focusTabButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.focusTabButtonText,
                    homeFocusPanel === "meetup" && styles.focusTabButtonTextActive,
                  ]}
                >
                  모임 일정
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setHomeFocusPanel("members")}
                style={[
                  styles.focusTabButton,
                  homeFocusPanel === "members" && styles.focusTabButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.focusTabButtonText,
                    homeFocusPanel === "members" && styles.focusTabButtonTextActive,
                  ]}
                >
                  멤버 목록
                </Text>
              </Pressable>
            </View>

            {homeFocusPanel === "pieces" ? (
              <>
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionLabel}>이번 주 분위기</Text>
                  <PuzzleCard
                    score={Math.max(1, Math.min(100, pieces.length * 12 + meetups.length * 8))}
                    theme={pieces[0]?.label ?? "새로운 기억을 기다리는 중"}
                  />
                </View>

                {showFirstPieceNudge ? (
                  <View style={styles.onboardingCard}>
                    <Text style={styles.onboardingTitle}>참여 완료! 첫 조각을 남겨볼까요?</Text>
                    <Text style={styles.onboardingBody}>
                      지금 한 줄만 적어도 모임 피드에 바로 공유돼요.
                    </Text>
                    <Pressable
                      disabled={isBusy}
                      onPress={handleStartFirstPiece}
                      style={({ pressed }) => [
                        styles.actionButton,
                        isBusy && styles.actionButtonDisabled,
                        pressed && !isBusy && styles.actionButtonPressed,
                      ]}
                    >
                      <Text style={styles.actionButtonText}>첫 조각 작성하기</Text>
                    </Pressable>
                  </View>
                ) : null}

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionLabel}>기억 조각 추가</Text>
                  <TextInput
                    ref={pieceInputRef}
                    multiline
                    onChangeText={setPieceBody}
                    placeholder="새 기억 조각"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, styles.multilineInput]}
                    value={pieceBody}
                  />
                  <Pressable
                    disabled={isBusy || pieceBody.trim().length === 0}
                    onPress={handleCreatePiece}
                    style={({ pressed }) => [
                      styles.actionButton,
                      (isBusy || pieceBody.trim().length === 0) && styles.actionButtonDisabled,
                      pressed &&
                        !(isBusy || pieceBody.trim().length === 0) &&
                        styles.actionButtonPressed,
                    ]}
                  >
                    <Text style={styles.actionButtonText}>
                      {isActionBusy("create_piece") ? "저장 중..." : "조각 저장"}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}

            {homeFocusPanel === "invite" ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionLabel}>초대/참여</Text>
                <Text style={styles.mutedText}>
                  초대 코드를 만들어 전달하거나, 받은 코드를 입력해 다른 모임에 참여할 수 있어요.
                </Text>
                {selectedCircle.role === "admin" ? (
                  <>
                    {inviteCode ? (
                      <Text style={styles.inviteCodeText}>{formatInviteCode(inviteCode)}</Text>
                    ) : null}
                    <Text style={styles.mutedText}>
                      새 코드를 발급하면 기존 코드는 바로 만료돼요.
                    </Text>
                    <Pressable
                      disabled={isBusy}
                      onPress={handleCreateInviteCode}
                      style={({ pressed }) => [
                        styles.actionButton,
                        isBusy && styles.actionButtonDisabled,
                        pressed && !isBusy && styles.actionButtonPressed,
                      ]}
                    >
                      <Text style={styles.actionButtonText}>
                        {isActionBusy("create_invite")
                          ? "발급 중..."
                          : inviteCode
                            ? "새 코드 다시 발급"
                            : "초대 코드 발급하기"}
                      </Text>
                    </Pressable>
                    {isInviteRotateConfirming ? (
                      <View style={styles.confirmCard}>
                        <Text style={styles.confirmText}>
                          기존 코드를 공유한 사람이 있다면 새 코드로 다시 안내해 주세요.
                        </Text>
                        <View style={styles.confirmActionRow}>
                          <Pressable
                            disabled={isBusy}
                            onPress={() => {
                              setIsInviteRotateConfirming(false);
                              setSuccessMessage("");
                            }}
                            style={({ pressed }) => [
                              styles.confirmCancelButton,
                              isBusy && styles.secondaryButtonDisabled,
                              pressed && !isBusy && styles.secondaryButtonPressed,
                            ]}
                          >
                            <Text style={styles.confirmCancelButtonText}>취소</Text>
                          </Pressable>
                          <Pressable
                            disabled={isBusy}
                            onPress={handleCreateInviteCode}
                            style={({ pressed }) => [
                              styles.confirmPrimaryButton,
                              isBusy && styles.actionButtonDisabled,
                              pressed && !isBusy && styles.actionButtonPressed,
                            ]}
                          >
                            <Text style={styles.confirmPrimaryButtonText}>새 코드 발급 진행</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : null}
                    {inviteCode ? (
                      <Pressable
                        disabled={isBusy}
                        onPress={handleShareInviteCode}
                        style={({ pressed }) => [
                          styles.secondaryButton,
                          isBusy && styles.secondaryButtonDisabled,
                          pressed && !isBusy && styles.secondaryButtonPressed,
                        ]}
                      >
                        <Text style={styles.secondaryButtonText}>
                          {isActionBusy("share_invite") ? "공유 중..." : "초대 코드 공유하기"}
                        </Text>
                      </Pressable>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.mutedText}>현재 계정은 멤버 권한이라 초대 코드를 만들 수 없어요.</Text>
                )}
                <TextInput
                  autoCapitalize="characters"
                  onChangeText={(next) => {
                    setJoinCode(normalizeInviteCode(next));
                  }}
                  placeholder="참여 코드 입력 (예: ABCD-1234)"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  value={formatInviteCode(joinCode)}
                />
                <Pressable
                  disabled={isBusy || joinCode.trim().length === 0}
                  onPress={handleJoinByCode}
                  style={({ pressed }) => [
                    styles.actionButton,
                    (isBusy || joinCode.trim().length === 0) && styles.actionButtonDisabled,
                    pressed &&
                      !(isBusy || joinCode.trim().length === 0) &&
                      styles.actionButtonPressed,
                  ]}
                >
                  <Text style={styles.actionButtonText}>
                    {isActionBusy("join_circle") ? "참여 중..." : "코드로 참여"}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {homeFocusPanel === "meetup" ? (
              <>
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionLabel}>새 모임 일정 추가</Text>
                  <TextInput
                    onChangeText={setMeetupTitle}
                    placeholder="새 모임 제목"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.input}
                    value={meetupTitle}
                  />
                  <Pressable
                    disabled={isBusy || meetupTitle.trim().length === 0}
                    onPress={handleCreateMeetup}
                    style={({ pressed }) => [
                      styles.actionButton,
                      (isBusy || meetupTitle.trim().length === 0) && styles.actionButtonDisabled,
                      pressed &&
                        !(isBusy || meetupTitle.trim().length === 0) &&
                        styles.actionButtonPressed,
                    ]}
                  >
                    <Text style={styles.actionButtonText}>
                      {isActionBusy("create_meetup") ? "저장 중..." : "모임 추가"}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionLabel}>다가오는 모임</Text>
                  {meetups.length === 0 ? (
                    <Text style={styles.mutedText}>
                      아직 등록된 모임이 없어요. 위에서 첫 모임을 만들어보세요.
                    </Text>
                  ) : (
                    meetups.map((meetup) => (
                      <MeetupDetailScreen
                        key={meetup.id}
                        meetup={{ id: meetup.id, title: meetup.title }}
                        pieces={pieces}
                        currentUserId={userId}
                      />
                    ))
                  )}
                </View>
              </>
            ) : null}

            {homeFocusPanel === "members" ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionLabel}>모임 멤버</Text>
                {members.length === 0 ? (
                  <Text style={styles.mutedText}>아직 멤버 정보를 불러오지 못했어요.</Text>
                ) : (
                  <View style={styles.memberList}>
                    {orderedMembers.map((member) => (
                      <View key={member.userId} style={styles.memberRow}>
                        <Text style={styles.memberNameText}>
                          {member.userId === userId
                            ? "나"
                            : `사용자 ${member.userId.slice(0, 6).toUpperCase()}`}
                        </Text>
                        <View
                          style={[
                            styles.memberRoleBadge,
                            member.role === "admin"
                              ? styles.memberRoleBadgeAdmin
                              : styles.memberRoleBadgeMember,
                          ]}
                        >
                          <Text style={styles.memberRoleBadgeText}>
                            {member.role === "admin" ? "관리자" : "멤버"}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : null}
          </>
        ) : null}

        {!isLoading && selectedCircle && activeTab === "feed" ? (
          <FeedScreen circleId={selectedCircle.id} refreshToken={feedRefreshToken} />
        ) : null}

        {successMessage ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable
              disabled={isBusy || isRefreshing}
              onPress={() => {
                void handleRefresh();
              }}
              style={({ pressed }) => [
                styles.errorRetryButton,
                (isBusy || isRefreshing) && styles.errorRetryButtonDisabled,
                pressed && !(isBusy || isRefreshing) && styles.errorRetryButtonPressed,
              ]}
            >
              <Text style={styles.errorRetryButtonText}>
                {isRefreshing ? "다시 시도 중..." : "다시 시도"}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    alignItems: "center",
    paddingBottom: 28,
    paddingTop: 16,
  },
  content: {
    gap: 16,
    width: "100%",
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
  heroTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  refreshButton: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  refreshButtonPressed: {
    opacity: 0.75,
  },
  refreshButtonDisabled: {
    opacity: 0.45,
  },
  refreshButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  heroBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  logoutButton: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  logoutButtonPressed: {
    opacity: 0.75,
  },
  logoutButtonDisabled: {
    opacity: 0.45,
  },
  logoutButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  tabButton: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabButtonText: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: "#fff",
  },
  focusTabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  focusTabButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  focusTabButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  focusTabButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  focusTabButtonTextActive: {
    color: "#fff",
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    gap: 12,
    padding: 16,
  },
  onboardingCard: {
    backgroundColor: "#eef5ff",
    borderColor: "#c9dcfb",
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  onboardingTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  onboardingBody: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  loadingWrap: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 18,
  },
  emptyStateTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  mutedText: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  emptyModeRow: {
    flexDirection: "row",
    gap: 8,
  },
  emptyModeButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emptyModeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  emptyModeButtonText: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  emptyModeButtonTextActive: {
    color: "#fff",
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  multilineInput: {
    minHeight: 92,
    textAlignVertical: "top",
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  actionButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  actionButtonDisabled: {
    backgroundColor: "#90a8d4",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  secondaryButtonPressed: {
    opacity: 0.75,
  },
  secondaryButtonDisabled: {
    opacity: 0.45,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  confirmCard: {
    backgroundColor: "#fff8ea",
    borderColor: "#f2dcaa",
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  confirmText: {
    color: colors.textPrimary,
    lineHeight: 20,
  },
  confirmActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  confirmCancelButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  confirmCancelButtonText: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  confirmPrimaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  confirmPrimaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  inviteCodeText: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 1.8,
    textAlign: "center",
  },
  circleTitle: {
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: "700",
  },
  circleTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  roleBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  roleBadgeAdmin: {
    backgroundColor: "#fff3dc",
    borderColor: "#f0d99a",
    borderWidth: 1,
  },
  roleBadgeMember: {
    backgroundColor: "#ebf4ff",
    borderColor: "#b7d5fb",
    borderWidth: 1,
  },
  roleBadgeText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  circleChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  memberSummaryRow: {
    alignItems: "flex-end",
  },
  memberSummaryText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  memberList: {
    gap: 8,
  },
  memberRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  memberNameText: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  memberRoleBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  memberRoleBadgeAdmin: {
    backgroundColor: "#fff3dc",
  },
  memberRoleBadgeMember: {
    backgroundColor: "#ebf4ff",
  },
  memberRoleBadgeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: "700",
  },
  circleChip: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  circleChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  circleChipText: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  circleChipTextActive: {
    color: "#fff",
  },
  errorBanner: {
    backgroundColor: "#f9e8e6",
    borderColor: "#efc8c2",
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 12,
  },
  successBanner: {
    backgroundColor: "#e8f7ec",
    borderColor: "#c4e9d0",
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 12,
  },
  successText: {
    color: "#1f7a3b",
    fontWeight: "700",
  },
  errorText: {
    color: colors.danger,
    fontWeight: "600",
  },
  errorRetryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderColor: "#efc8c2",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  errorRetryButtonPressed: {
    opacity: 0.75,
  },
  errorRetryButtonDisabled: {
    opacity: 0.45,
  },
  errorRetryButtonText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700",
  },
});
