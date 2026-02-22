import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useResponsiveLayout } from "../../core/ui/layout";
import { colors, radii } from "../../core/ui/tokens";
import { requestEmailOtp, verifyEmailOtp } from "./authService";

type Step = "email" | "code";
const OTP_LENGTH = 8;
const EMAIL_HISTORY_KEY = "@ourthen/email-history";
const EMAIL_HISTORY_LIMIT = 5;

export function EmailOtpAuthScreen() {
  const layout = useResponsiveLayout();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [recentEmails, setRecentEmails] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const raw = await AsyncStorage.getItem(EMAIL_HISTORY_KEY);
      if (!raw || !mounted) {
        return;
      }
      try {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) {
          setRecentEmails(parsed.filter((value) => typeof value === "string").slice(0, EMAIL_HISTORY_LIMIT));
        }
      } catch {
        setRecentEmails([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredRecentEmails = useMemo(() => {
    const q = email.trim().toLowerCase();
    if (!q) {
      return recentEmails;
    }
    return recentEmails.filter((value) => value.toLowerCase().includes(q));
  }, [email, recentEmails]);

  const saveEmailHistory = async (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
      return;
    }

    const next = [trimmed, ...recentEmails.filter((item) => item !== trimmed)].slice(
      0,
      EMAIL_HISTORY_LIMIT,
    );
    setRecentEmails(next);
    await AsyncStorage.setItem(EMAIL_HISTORY_KEY, JSON.stringify(next));
  };

  const handleSendCode = async () => {
    if (!email.trim()) {
      setErrorMessage("이메일을 입력해 주세요.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");
      await requestEmailOtp(email.trim());
      await saveEmailHistory(email);
      setStep("code");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "인증코드 전송에 실패했어요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      setErrorMessage(`${OTP_LENGTH}자리 인증코드를 입력해 주세요.`);
      return;
    }

    if (code.trim().length !== OTP_LENGTH) {
      setErrorMessage(`인증코드는 ${OTP_LENGTH}자리여야 해요.`);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");
      await verifyEmailOtp(email.trim(), code.trim());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "인증 확인에 실패했어요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboardRoot}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={Keyboard.dismiss}
          style={styles.screen}
        >
          <View style={styles.decorationLarge} />
          <View style={styles.decorationSmall} />

          <Pressable
            onPress={(event) => {
              event.stopPropagation();
            }}
            style={[
              styles.card,
              {
                maxWidth: layout.contentMaxWidth,
                paddingHorizontal: layout.cardPadding,
                paddingVertical: layout.cardPadding + 2,
              },
            ]}
          >
            <View style={styles.header}>
              <Text style={styles.badge}>K-서비스 베타</Text>
              <Text style={styles.title}>로그인</Text>
              <Text style={styles.subtitle}>이메일 인증으로 안전하게 시작해요.</Text>
            </View>

            {step === "email" ? (
              <View style={styles.form}>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  onSubmitEditing={Keyboard.dismiss}
                  placeholder="이메일"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                  style={styles.input}
                  textContentType="emailAddress"
                  value={email}
                />
                {filteredRecentEmails.length > 0 ? (
                  <View style={styles.suggestionWrap}>
                    <Text style={styles.suggestionTitle}>최근 사용 이메일</Text>
                    <View style={styles.suggestionList}>
                      {filteredRecentEmails.map((item) => (
                        <Pressable
                          key={item}
                          onPress={() => {
                            setEmail(item);
                            Keyboard.dismiss();
                          }}
                          style={({ pressed }) => [
                            styles.suggestionItem,
                            pressed && styles.suggestionItemPressed,
                          ]}
                        >
                          <Text style={styles.suggestionText}>{item}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
                <Pressable
                  onPress={handleSendCode}
                  style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.buttonText}>{isLoading ? "전송 중..." : "인증코드 받기"}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.form}>
                <Text style={styles.caption}>{email}로 인증코드를 보냈어요.</Text>
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={setCode}
                  onSubmitEditing={Keyboard.dismiss}
                  placeholder={`${OTP_LENGTH}자리 인증코드`}
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                  style={styles.input}
                  value={code}
                />
                <Pressable
                  onPress={handleVerifyCode}
                  style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.buttonText}>{isLoading ? "확인 중..." : "인증하기"}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setStep("email");
                    setCode("");
                    setErrorMessage("");
                  }}
                  style={styles.linkButton}
                >
                  <Text style={styles.linkText}>이메일 다시 입력</Text>
                </Pressable>
              </View>
            )}

            <Pressable onPress={Keyboard.dismiss} style={styles.dismissKeyboardButton}>
              <Text style={styles.dismissKeyboardText}>키보드 내리기</Text>
            </Pressable>
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          </Pressable>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  screen: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 16,
    position: "relative",
  },
  decorationLarge: {
    backgroundColor: "#efe3cf",
    borderRadius: 160,
    height: 320,
    opacity: 0.8,
    position: "absolute",
    right: -120,
    top: -110,
    width: 320,
  },
  decorationSmall: {
    backgroundColor: "#d8ebe7",
    borderRadius: 120,
    bottom: -70,
    height: 240,
    left: -110,
    opacity: 0.9,
    position: "absolute",
    width: 240,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    elevation: 3,
    gap: 18,
    shadowColor: "#4a3d2c",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    width: "100%",
  },
  header: {
    gap: 8,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.badge,
    borderRadius: 999,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: 12,
  },
  suggestionWrap: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 10,
  },
  suggestionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  suggestionList: {
    gap: 6,
  },
  suggestionItem: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  suggestionItemPressed: {
    opacity: 0.75,
  },
  suggestionText: {
    color: colors.textPrimary,
    fontSize: 13,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.textPrimary,
    padding: 12,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    padding: 12,
  },
  buttonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  caption: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  linkButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
  },
  linkText: {
    color: colors.primary,
    fontWeight: "600",
  },
  dismissKeyboardButton: {
    alignSelf: "flex-end",
  },
  dismissKeyboardText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  error: {
    color: colors.danger,
    fontWeight: "600",
  },
});
