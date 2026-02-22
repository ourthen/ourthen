import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthGate } from "../features/auth/AuthGate";
import { supabase } from "../lib/supabase";
import { colors } from "./ui/tokens";

export default function AppRoot() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={["top", "left", "right", "bottom"]} style={styles.container}>
        <AuthGate session={session} />
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
