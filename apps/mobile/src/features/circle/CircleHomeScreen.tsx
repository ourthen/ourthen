import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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
  fetchPiecesByCircle: typeof circleService.fetchPiecesByCircle;
  createCircleWithMembership: typeof circleService.createCircleWithMembership;
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
  fetchPiecesByCircle: circleService.fetchPiecesByCircle,
  createCircleWithMembership: circleService.createCircleWithMembership,
  createMeetup: circleService.createMeetup,
  createTextPiece: circleService.createTextPiece,
};

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
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
  const [pieces, setPieces] = useState<circleService.PieceSummary[]>([]);
  const [circleName, setCircleName] = useState("");
  const [meetupTitle, setMeetupTitle] = useState("");
  const [pieceBody, setPieceBody] = useState("");
  const [activeTab, setActiveTab] = useState<"home" | "feed">("home");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [feedRefreshToken, setFeedRefreshToken] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const isSplitLayout = layout.breakpoint === "desktop";
  const selectedCircle = useMemo(
    () => circles.find((circle) => circle.id === selectedCircleId) ?? null,
    [circles, selectedCircleId],
  );

  const loadCircleContent = useCallback(
    async (circleId: string) => {
      const [nextMeetups, nextPieces] = await Promise.all([
        service.fetchMeetupsByCircle(circleId),
        service.fetchPiecesByCircle(circleId),
      ]);

      setMeetups(nextMeetups);
      setPieces(nextPieces);
    },
    [service],
  );

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const fetchedCircles = await service.fetchMyCircles(userId);
      setCircles(fetchedCircles);
      const nextCircleId = fetchedCircles[0]?.id ?? null;
      setSelectedCircleId(nextCircleId);

      if (nextCircleId) {
        await loadCircleContent(nextCircleId);
      } else {
        setMeetups([]);
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

  const handleSelectCircle = async (circleId: string) => {
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
      setIsSaving(true);
      setErrorMessage("");
      const created = await service.createCircleWithMembership(circleName, userId);
      setCircleName("");
      setCircles((prev) => [created, ...prev]);
      setSelectedCircleId(created.id);
      await loadCircleContent(created.id);
    } catch (error) {
      setErrorMessage(messageFromError(error, "모임 만들기에 실패했어요."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateMeetup = async () => {
    if (!selectedCircleId) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");
      await service.createMeetup(selectedCircleId, userId, meetupTitle);
      setMeetupTitle("");
      await loadCircleContent(selectedCircleId);
    } catch (error) {
      setErrorMessage(messageFromError(error, "모임 생성에 실패했어요."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreatePiece = async () => {
    if (!selectedCircleId) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");
      await service.createTextPiece(selectedCircleId, userId, pieceBody);
      setPieceBody("");
      await loadCircleContent(selectedCircleId);
      setFeedRefreshToken((prev) => prev + 1);
    } catch (error) {
      setErrorMessage(messageFromError(error, "기억 조각 저장에 실패했어요."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (!onSignOut) {
      return;
    }

    try {
      setIsSigningOut(true);
      setErrorMessage("");
      await onSignOut();
    } catch (error) {
      setErrorMessage(messageFromError(error, "로그아웃에 실패했어요."));
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingHorizontal: layout.horizontalPadding,
        },
      ]}
    >
      <View style={[styles.content, { maxWidth: layout.contentMaxWidth }]}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroTitle}>우리그때 홈</Text>
            {onSignOut ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void handleSignOut();
                }}
                style={({ pressed }) => [
                  styles.logoutButton,
                  pressed && styles.logoutButtonPressed,
                ]}
              >
                <Text style={styles.logoutButtonText}>
                  {isSigningOut ? "로그아웃 중..." : "로그아웃"}
                </Text>
              </Pressable>
            ) : null}
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
            <Text style={styles.mutedText}>새 모임을 만들면 바로 조각 기록을 시작할 수 있어요.</Text>
            <TextInput
              onChangeText={setCircleName}
              placeholder="모임 이름"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              value={circleName}
            />
            <Pressable
              onPress={handleCreateCircle}
              style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            >
              <Text style={styles.actionButtonText}>{isSaving ? "생성 중..." : "모임 만들기"}</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && selectedCircle && activeTab === "home" ? (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>내 모임</Text>
              <Text style={styles.circleTitle}>{selectedCircle.name}</Text>
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
            </View>

            <View style={[styles.sectionGrid, isSplitLayout && styles.sectionGridDesktop]}>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionLabel}>이번 주 분위기</Text>
                <PuzzleCard
                  score={Math.max(1, Math.min(100, pieces.length * 12 + meetups.length * 8))}
                  theme={pieces[0]?.label ?? "새로운 기억을 기다리는 중"}
                />
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionLabel}>새 모임 만들기</Text>
                <TextInput
                  onChangeText={setMeetupTitle}
                  placeholder="새 모임 제목"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  value={meetupTitle}
                />
                <Pressable
                  onPress={handleCreateMeetup}
                  style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
                >
                  <Text style={styles.actionButtonText}>{isSaving ? "저장 중..." : "모임 추가"}</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>기억 조각 추가</Text>
              <TextInput
                multiline
                onChangeText={setPieceBody}
                placeholder="새 기억 조각"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, styles.multilineInput]}
                value={pieceBody}
              />
              <Pressable
                onPress={handleCreatePiece}
                style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
              >
                <Text style={styles.actionButtonText}>{isSaving ? "저장 중..." : "조각 저장"}</Text>
              </Pressable>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>다가오는 모임</Text>
              {meetups.length === 0 ? (
                <Text style={styles.mutedText}>아직 등록된 모임이 없어요. 위에서 첫 모임을 만들어보세요.</Text>
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

        {!isLoading && selectedCircle && activeTab === "feed" ? (
          <FeedScreen circleId={selectedCircle.id} refreshToken={feedRefreshToken} />
        ) : null}

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
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
  sectionGrid: {
    gap: 14,
  },
  sectionGridDesktop: {
    flexDirection: "row",
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
  actionButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  circleTitle: {
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: "700",
  },
  circleChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  errorText: {
    color: colors.danger,
    fontWeight: "600",
  },
});
