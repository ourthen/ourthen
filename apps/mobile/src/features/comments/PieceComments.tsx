import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii } from "../../core/ui/tokens";
import * as commentsService from "./commentsService";

type PieceCommentsProps = {
  meetupId: string;
  pieceId: string;
  currentUserId?: string;
  service?: {
    fetchPieceComments: typeof commentsService.fetchPieceComments;
    createPieceComment: typeof commentsService.createPieceComment;
  };
};

const defaultService = {
  fetchPieceComments: commentsService.fetchPieceComments,
  createPieceComment: commentsService.createPieceComment,
};

function messageFromError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "댓글 처리에 실패했어요.";
}

export function PieceComments({
  meetupId,
  pieceId,
  currentUserId,
  service = defaultService,
}: PieceCommentsProps) {
  const [comments, setComments] = useState<commentsService.PieceCommentItem[]>([]);
  const [body, setBody] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!currentUserId) {
      return () => {
        mounted = false;
      };
    }

    void (async () => {
      try {
        setIsLoading(true);
        const rows = await service.fetchPieceComments(pieceId);
        if (mounted) {
          setComments(rows);
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
  }, [currentUserId, pieceId, service]);

  const handleSubmit = async () => {
    if (!currentUserId) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");
      const created = await service.createPieceComment({
        pieceId,
        meetupId,
        authorId: currentUserId,
        body,
      });
      setComments((prev) => [...prev, created]);
      setBody("");
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {isLoading ? <Text style={styles.caption}>댓글 불러오는 중...</Text> : null}
      {comments.map((comment) => (
        <Text key={comment.id} style={styles.commentItem}>
          {comment.body}
        </Text>
      ))}
      <TextInput
        placeholder="댓글 입력"
        accessibilityLabel={`comment-input-${meetupId}-${pieceId}`}
        placeholderTextColor={colors.textSecondary}
        onChangeText={setBody}
        style={styles.input}
        value={body}
      />
      <Pressable
        onPress={() => {
          void handleSubmit();
        }}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>{isSaving ? "저장 중..." : "댓글 남기기"}</Text>
      </Pressable>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginTop: 2,
  },
  caption: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  commentItem: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: 8,
  },
  buttonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  buttonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "600",
  },
});
