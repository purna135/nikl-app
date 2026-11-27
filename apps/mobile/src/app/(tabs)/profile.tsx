import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';
import { categoryById, formatIndianPhone } from '@nikl/utils';
import { EventCard } from '@/components/event-card';
import { PersonPostGrid, ProfileHeader } from '@/components/people';
import { Button, EmptyState, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useExploreEvents } from '@/lib/explore';
import { usePersonProfile } from '@/lib/people';
import { isProfileComplete, useMyProfile, type MyProfile } from '@/lib/profile';
import { useHidden } from '@/lib/safety';
import { useSavedEventIds, useSocial } from '@/lib/social';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { radius, space, useNiklTheme } from '@/theme';

export default function ProfileScreen() {
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

  // Coming back to this tab reloads the profile; keep showing the last one meanwhile.
  if (loading && !profile) {
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

  const details = (
    <>
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
    </>
  );

  return (
    <Screen>
      <T variant="title">You</T>
      {profile?.username ? <MyProfileAndPosts profile={profile} username={profile.username} details={details} /> : null}
      <SavedEvents />
      <T variant="muted">Your plans, memories and City Passport will live here.</T>
      <Button label="Log out" kind="secondary" onPress={() => supabase?.auth.signOut()} />
    </Screen>
  );
}

/** Your profile header (counts) and your posts, with "Under review" and "Removed" on your own tiles. */
function MyProfileAndPosts({ profile, username, details }: { profile: MyProfile; username: string; details: ReactNode }) {
  const t = useNiklTheme();
  const { width } = useWindowDimensions();
  const hidden = useHidden();
  const mine = usePersonProfile(username);
  const me = mine.data?.profile ?? null;
  const posts = (mine.data?.posts ?? []).filter((p) => !hidden.posts.has(p.id));

  let header;
  if (me) {
    header = (
      <ProfileHeader profile={me} posts={posts.length} followers={me.followers}>
        {details}
      </ProfileHeader>
    );
  } else {
    // Counts didn't load (yet): the basics we already have.
    header = (
      <View style={[styles.card, { backgroundColor: t.surface2 }]}>
        <T variant="heading">{profile.name}</T>
        <T variant="muted">
          @{username}
          {profile.area ? ` · ${profile.area}` : ''}
        </T>
        {details}
      </View>
    );
  }

  let grid;
  if (mine.loading) {
    grid = <ActivityIndicator color={t.muted} accessibilityLabel="Loading your posts" style={{ marginVertical: space.lg }} />;
  } else if (mine.failed && !mine.data) {
    grid = <EmptyState emoji="📡" title="Couldn’t load your posts" body="Check your internet connection and try again." action={{ label: 'Try again', onPress: mine.refresh }} />;
  } else if (posts.length === 0) {
    grid = (
      <EmptyState
        emoji="📸"
        title="No posts yet"
        body="Share photos from the plans you go to. Nikl checks new posts before others see them."
        action={{ label: 'New post', onPress: () => router.push('/create/post') }}
      />
    );
  } else {
    grid = <PersonPostGrid posts={posts} width={width - space.lg * 2} own />;
  }

  return (
    <>
      {header}
      <View style={styles.section}>
        <T variant="heading" accessibilityRole="header">
          Your posts
        </T>
        {grid}
      </View>
    </>
  );
}

/** Upcoming events you saved (bookmarked), soonest first. */
function SavedEvents() {
  const t = useNiklTheme();
  const saves = useSavedEventIds();
  const explore = useExploreEvents();
  const social = useSocial();

  const saved = explore.rows.filter((e) => social.isSaved(e.event_id, saves.data?.has(e.event_id) ?? false, saves.fetchedAt));
  const retry = () => {
    saves.refresh();
    explore.refresh();
  };

  let body;
  if (saves.loading || explore.loading) {
    body = <ActivityIndicator color={t.muted} accessibilityLabel="Loading saved events" style={{ marginVertical: space.lg }} />;
  } else if ((saves.failed && !saves.data) || (explore.error && explore.rows.length === 0)) {
    body = (
      <EmptyState
        emoji="📡"
        title="Couldn’t load your saved events"
        body="Check your internet connection and try again."
        action={{ label: 'Try again', onPress: retry }}
      />
    );
  } else if (saved.length === 0) {
    body = (
      <EmptyState
        emoji="🔖"
        title="Nothing saved yet"
        body="Tap the bookmark on a post or an event to keep it here for later."
        action={{ label: 'Find something to do', onPress: () => router.navigate('/explore') }}
      />
    );
  } else {
    body = saved.map((e) => <EventCard key={e.event_id} event={e} />);
  }

  return (
    <View style={styles.section}>
      <T variant="heading" accessibilityRole="header">
        Saved
      </T>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginVertical: space.xs },
  chip: { paddingHorizontal: space.sm + 2, paddingVertical: space.xs + 2, borderRadius: radius.pill },
  section: { gap: space.md },
});
