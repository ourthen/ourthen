import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../../core/ui/tokens";
import { PieceComments } from "../comments/PieceComments";
import { MentionButton } from "./MentionButton";
import * as meetupService from "./meetupService";

type Meetup = {
  id: string;
  title: string;
};

type Piece = {
  id: string;
  label: string;
};

type MeetupDetailScreenProps = {
  meetup: Meetup;
  pieces: Piece[];
  currentUserId?: string;
  service?: {
    fetchMentionedPieceIds: typeof meetupService.fetchMentionedPieceIds;
    createPieceMention: typeof meetupService.createPieceMention;
    fetchAttendanceStatus: typeof meetupService.fetchAttendanceStatus;
    upsertAttendanceStatus: typeof meetupService.upsertAttendanceStatus;
  };
};

const defaultService = {
  fetchMentionedPieceIds: meetupService.fetchMentionedPieceIds,
  createPieceMention: meetupService.createPieceMention,
  fetchAttendanceStatus: meetupService.fetchAttendanceStatus,
  upsertAttendanceStatus: meetupService.upsertAttendanceStatus,
};

function messageFromError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "언급 저장에 실패했어요.";
}

export function MeetupDetailScreen({
  meetup,
  pieces,
  currentUserId,
  service = defaultService,
}: MeetupDetailScreenProps) {
  const [mentionedPieceIds, setMentionedPieceIds] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [isSavingMention, setIsSavingMention] = useState(false);
  const [attendance, setAttendance] = useState<boolean | null>(null);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  const mentionedCount = useMemo(
    () => Object.values(mentionedPieceIds).filter(Boolean).length,
    [mentionedPieceIds],
  );

  useEffect(() => {
    let mounted = true;

    if (!currentUserId) {
      return () => {
        mounted = false;
      };
    }

    void (async () => {
      try {
        const [mentioned, attendanceStatus] = await Promise.all([
          service.fetchMentionedPieceIds(meetup.id),
          service.fetchAttendanceStatus(meetup.id, currentUserId),
        ]);
        if (!mounted) {
          return;
        }
        const nextState: Record<string, boolean> = {};
        mentioned.forEach((pieceId) => {
          nextState[pieceId] = true;
        });
        setMentionedPieceIds(nextState);
        setAttendance(attendanceStatus);
      } catch (error) {
        if (mounted) {
          setErrorMessage(messageFromError(error));
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [currentUserId, meetup.id, service]);

  const handleMention = async (pieceId: string) => {
    setMentionedPieceIds((prev) => ({ ...prev, [pieceId]: true }));
    if (!currentUserId) {
      return;
    }

    try {
      setIsSavingMention(true);
      setErrorMessage("");
      await service.createPieceMention(meetup.id, pieceId, currentUserId);
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setIsSavingMention(false);
    }
  };

  const handleAttendance = async (next: boolean) => {
    if (!currentUserId) {
      return;
    }

    setAttendance(next);
    try {
      setIsSavingAttendance(true);
      setErrorMessage("");
      await service.upsertAttendanceStatus(meetup.id, currentUserId, next);
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setIsSavingAttendance(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{meetup.title}</Text>
      <Text style={styles.caption}>
        {mentionedCount > 0 ? `${mentionedCount}개 조각이 언급되었어요.` : "아직 언급된 조각이 없어요."}
      </Text>
      {currentUserId ? (
        <View style={styles.attendanceWrap}>
          <View style={styles.attendanceButtons}>
            <Pressable
              onPress={() => {
                void handleAttendance(true);
              }}
              style={[
                styles.attendanceButton,
                attendance === true && styles.attendanceButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.attendanceButtonText,
                  attendance === true && styles.attendanceButtonTextActive,
                ]}
              >
                참석할게요
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void handleAttendance(false);
              }}
              style={[
                styles.attendanceButton,
                attendance === false && styles.attendanceButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.attendanceButtonText,
                  attendance === false && styles.attendanceButtonTextActive,
                ]}
              >
                이번엔 어려워요
              </Text>
            </Pressable>
          </View>
          <Text style={styles.attendanceCaption}>
            {isSavingAttendance
              ? "참석 상태 저장 중..."
              : attendance === null
                ? "참석 여부를 알려주세요."
                : attendance
                  ? "현재 응답: 참석"
                  : "현재 응답: 불참"}
          </Text>
        </View>
      ) : null}
      {pieces.map((piece) => (
        <View key={piece.id} style={styles.pieceCard}>
          <Text style={styles.pieceTitle}>{piece.label}</Text>
          <MentionButton
            disabled={isSavingMention}
            onMention={() => {
              void handleMention(piece.id);
            }}
          />
          {mentionedPieceIds[piece.id] ? (
            <PieceComments
              meetupId={meetup.id}
              pieceId={piece.id}
              currentUserId={currentUserId}
            />
          ) : null}
        </View>
      ))}
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  caption: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  attendanceWrap: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 8,
    padding: 10,
  },
  attendanceButtons: {
    flexDirection: "row",
    gap: 8,
  },
  attendanceButton: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 8,
  },
  attendanceButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  attendanceButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  attendanceButtonTextActive: {
    color: "#fff",
  },
  attendanceCaption: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  pieceCard: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  pieceTitle: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  errorText: {
    color: colors.danger,
    fontWeight: "600",
  },
});
