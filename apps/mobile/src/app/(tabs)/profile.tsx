import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { categoryById, formatIndianPhone } from '@nikl/utils';
import { Button, EmptyState, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { isProfileComplete, useMyProfile } from '@/lib/profile';
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

  return <SignedInProfile userId={session.user.id} phone={session.user.phone} />;
}

function SignedInProfile({ userId, phone }: { userId: string; phone?: string }) {
  const t = useNiklTheme();
  const { profile, loading } = useMyProfile(userId);
  const phoneText = phone ? formatIndianPhone(`+${phone}`) : 'Not available';

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator style={{ marginTop: space.xxl }} />
      </Screen>
    );
  }

  if (!isProfileComplete(profile)) {
    return (
      <Screen>
        <T variant="title">You</T>
        <EmptyState emoji="✍️" title="Finish setting up" body="Add your name, a username and what you're into, so we can show you plans you'll like." />
        <Button label="Set up my profile" onPress={() => router.push('/profile-setup')} />
        <Button label="Log out" kind="secondary" onPress={() => supabase?.auth.signOut()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <T variant="title">You</T>
      <View style={[styles.card, { backgroundColor: t.surface2 }]}>
        <T variant="heading">{profile?.name}</T>
        <T variant="muted">
          @{profile?.username}
          {profile?.area ? ` · ${profile.area}` : ''}
        </T>
        <View style={styles.chips}>
          {(profile?.interests ?? []).map((id) => {
            const c = categoryById(id);
            return c ? (
              <View key={id} style={[styles.chip, { backgroundColor: t.tints[c.tint] }]}>
                <T style={{ color: t.onTint, fontSize: 13, fontWeight: '600' }}>
                  {c.emoji} {c.short}
                </T>
              </View>
            ) : null;
          })}
        </View>
        <T variant="small">Phone (only you can see this): {phoneText}</T>
      </View>
      <T variant="muted">Your plans, memories and City Passport will live here.</T>
      <Button label="Log out" kind="secondary" onPress={() => supabase?.auth.signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginVertical: space.xs },
  chip: { paddingHorizontal: space.sm + 2, paddingVertical: space.xs + 2, borderRadius: radius.pill },
});
