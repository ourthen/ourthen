import { supabase } from "../../lib/supabase";

export type OAuthProvider = "google" | "apple";

export async function requestEmailOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    throw error;
  }
}

export async function verifyEmailOtp(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (!error) {
    return;
  }

  // For first-time users, Supabase can emit a signup token.
  const { error: signupError } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });

  if (signupError) {
    throw signupError;
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

// OAuth expansion point for the next iteration.
export async function signInWithOAuth(provider: OAuthProvider): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
  });

  if (error) {
    throw error;
  }
}
