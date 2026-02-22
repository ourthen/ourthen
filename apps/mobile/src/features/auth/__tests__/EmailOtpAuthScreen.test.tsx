import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Keyboard } from "react-native";
import { EmailOtpAuthScreen } from "../EmailOtpAuthScreen";
import * as authService from "../authService";

jest.mock("../authService", () => ({
  requestEmailOtp: jest.fn(),
  verifyEmailOtp: jest.fn(),
}));

describe("EmailOtpAuthScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    (authService.requestEmailOtp as jest.Mock).mockResolvedValue(undefined);
    (authService.verifyEmailOtp as jest.Mock).mockResolvedValue(undefined);
  });

  it("requests email otp and moves to code step", async () => {
    render(<EmailOtpAuthScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("이메일"), "test@example.com");
    fireEvent.press(screen.getByText("인증코드 받기"));

    await waitFor(() => {
      expect(authService.requestEmailOtp).toHaveBeenCalledWith("test@example.com");
      expect(screen.getByPlaceholderText("8자리 인증코드")).toBeTruthy();
    });
  });

  it("verifies otp code with previously entered email", async () => {
    render(<EmailOtpAuthScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("이메일"), "test@example.com");
    fireEvent.press(screen.getByText("인증코드 받기"));

    await waitFor(() => expect(screen.getByPlaceholderText("8자리 인증코드")).toBeTruthy());

    fireEvent.changeText(screen.getByPlaceholderText("8자리 인증코드"), "12345678");
    fireEvent.press(screen.getByText("인증하기"));

    await waitFor(() => {
      expect(authService.verifyEmailOtp).toHaveBeenCalledWith("test@example.com", "12345678");
    });
  });

  it("shows recent email suggestions and applies selected email", async () => {
    await AsyncStorage.setItem(
      "@ourthen/email-history",
      JSON.stringify(["old1@example.com", "old2@example.com"]),
    );

    render(<EmailOtpAuthScreen />);

    await waitFor(() => {
      expect(screen.getByText("최근 사용 이메일")).toBeTruthy();
      expect(screen.getByText("old1@example.com")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("old1@example.com"));

    await waitFor(() => {
      expect(screen.getByDisplayValue("old1@example.com")).toBeTruthy();
    });
  });

  it("dismisses keyboard with dedicated action", async () => {
    const dismissSpy = jest.spyOn(Keyboard, "dismiss").mockImplementation(() => {});

    render(<EmailOtpAuthScreen />);

    fireEvent.press(screen.getByText("키보드 내리기"));

    expect(dismissSpy).toHaveBeenCalled();
    dismissSpy.mockRestore();
  });
});
