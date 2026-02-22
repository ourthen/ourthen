import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../../core/ui/tokens";
import * as feedService from "./feedService";

type FeedScreenProps = {
  circleId: string;
  refreshToken?: number;
  service?: {
    fetchFeedItems: typeof feedService.fetchFeedItems;
  };
};

const defaultService = {
  fetchFeedItems: feedService.fetchFeedItems,
};

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "시간 정보 없음";
  }
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

function messageFromError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "피드를 불러오지 못했어요.";
}

export function FeedScreen({
  circleId,
  refreshToken = 0,
  service = defaultService,
}: FeedScreenProps) {
  const [items, setItems] = useState<feedService.FeedItemSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const rows = await service.fetchFeedItems(circleId);
        if (mounted) {
          setItems(rows);
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(messageFromError(error));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [circleId, refreshToken, service]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>피드</Text>
      <Text style={styles.caption}>모임에서 남긴 조각이 시간순으로 모입니다.</Text>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.caption}>피드 불러오는 중...</Text>
        </View>
      ) : null}

      {!isLoading && items.length === 0 ? (
        <Text style={styles.emptyText}>아직 기록된 조각이 없어요.</Text>
      ) : null}

      {!isLoading && items.length > 0 ? (
        <ScrollView contentContainerStyle={styles.feedList} nestedScrollEnabled>
          {items.map((item) => (
            <View key={item.id} style={styles.feedCard}>
              <Text style={styles.feedBody}>{item.body}</Text>
              <Text style={styles.feedMeta}>{formatCreatedAt(item.createdAt)}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  caption: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  loadingWrap: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  feedList: {
    gap: 8,
    maxHeight: 260,
    paddingTop: 4,
  },
  feedCard: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  feedBody: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  feedMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "600",
  },
});
