import type { Session } from "@supabase/supabase-js";
import { CircleHomeScreen } from "../circle/CircleHomeScreen";
import { EmailOtpAuthScreen } from "./EmailOtpAuthScreen";

type AuthGateProps = {
  session: Session | null;
};

export function AuthGate({ session }: AuthGateProps) {
  if (!session) {
    return <EmailOtpAuthScreen />;
  }

  return <CircleHomeScreen userId={session.user.id} />;
}
