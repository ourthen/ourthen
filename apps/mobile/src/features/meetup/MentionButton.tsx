import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radii } from "../../core/ui/tokens";

type MentionButtonProps = {
  disabled?: boolean;
  onMention: () => void;
};

export function MentionButton({ disabled = false, onMention }: MentionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onMention}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={styles.text}>{disabled ? "저장 중..." : "언급됨"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  text: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
