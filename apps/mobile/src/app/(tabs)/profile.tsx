import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { formatIndianPhone } from '@nikl/utils';
import { Button, EmptyState, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { radius, space, useNiklTheme } from '@/theme';

export default function ProfileScreen() {
  const t = useNiklTheme();
  const { loading, session } = useAuth();

  if (!supabaseConfigured) {
    return (
      <Screen>
        <T variant="title">You</T>
        <EmptyState emoji="🔌" title="Not connected yet" body="Copy the mobile values from .env.example into apps/mobile/.env, then restart Expo." />
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator style={{ marginTop: space.xxl }} />
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen>
        <T variant="title">You</T>
        <EmptyState emoji="👋" title="Log in to Nikl" body="Use your phone number. We'll text you a 6-digit code, no password needed." />
        <Button label="Log in with your phone" onPress={() => router.push('/login')} />
      </Screen>
    );
  }

  const phone = session.user.phone ? formatIndianPhone(`+${session.user.phone}`) : 'Not available';
  return (
    <Screen>
      <T variant="title">You</T>
      <View style={[styles.card, { backgroundColor: t.surface2 }]}>
        <T variant="heading">You&apos;re in ✓</T>
        <T variant="muted">Login works. Your profile, memories and City Passport will live here.</T>
        <View style={styles.kv}>
          <T variant="small">Phone</T>
          <T style={{ fontWeight: '600' }}>{phone}</T>
          <T variant="small">User ID</T>
          <T style={{ fontWeight: '600' }} selectable>
            {session.user.id}
          </T>
        </View>
      </View>
      <Button label="Log out" kind="secondary" onPress={() => supabase?.auth.signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  kv: { gap: 2, marginTop: space.sm },
});
