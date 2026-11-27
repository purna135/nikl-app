import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PersonPostGrid, ProfileHeader } from '@/components/people';
import { ContentMenu, useContentMenu } from '@/components/safety';
import { FollowButton, Icon } from '@/components/social';
import { Button, EmptyState, T } from '@/components/ui';
import { usePersonProfile, type PersonData, type PersonProfile } from '@/lib/people';
import { setBlock, useHidden } from '@/lib/safety';
import { adjustCount, useSocial } from '@/lib/social';
import { radius, fontSize, space, touchTarget, useNiklTheme } from '@/theme';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** A person's profile: who they are, follow, their posts. Report and block from ⋯. */
export default function PersonScreen() {
  const t = useNiklTheme();
  const { username } = useLocalSearchParams<{ username: string }>();
  const { connected, loading, refreshing, data, failed, fetchedAt, refresh } = usePersonProfile(username);
  const hidden = useHidden();
  const menu = useContentMenu();
  const profile = data?.profile ?? null;
  // Blocked on this phone since the profile loaded: show it as blocked straight away.
  const blocked = Boolean(profile && (profile.blocked_by_me || hidden.users.has(profile.user_id)));

  let body;
  if (!connected) {
    body = (
      <View style={styles.pad}>
        <EmptyState emoji="🔌" title="Not connected yet" body="This copy of the app isn’t linked to Nikl’s server yet." />
      </View>
    );
  } else if (loading || (refreshing && !data)) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={t.muted} accessibilityLabel="Loading profile" />
      </View>
    );
  } else if (!data || fetchedAt === null) {
    body = (
      <View style={styles.pad}>
        <EmptyState emoji="📡" title="Couldn’t load this profile" body="Check your internet connection and try again." action={{ label: 'Try again', onPress: refresh }} />
      </View>
    );
  } else if (!profile) {
    body = (
      <View style={styles.pad}>
        <EmptyState
          emoji="🔍"
          title="We couldn’t find this person"
          body="They may have changed their username, or the account isn’t available."
          action={{ label: 'Go to Home', onPress: () => router.navigate('/') }}
        />
      </View>
    );
  } else if (blocked) {
    body = <BlockedBody profile={profile} onChanged={refresh} />;
  } else {
    body = <PersonBody profile={profile} data={data} fetchedAt={fetchedAt} failed={failed} refreshing={refreshing} onRefresh={refresh} />;
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: t.app }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.back, { backgroundColor: t.surface2, opacity: pressed ? 0.8 : 1 }]}>
          <Text style={[styles.backGlyph, { color: t.ink }]}>←</Text>
        </Pressable>
        <Text style={[styles.topHandle, { color: t.ink }]} numberOfLines={1} accessibilityRole="header">
          {profile ? profile.username : (username ?? '')}
        </Text>
        {profile && !profile.is_me && (
          <Pressable
            onPress={() =>
              menu.open({
                type: 'user',
                id: profile.user_id,
                mine: false,
                handle: profile.username,
                person: { id: profile.user_id, handle: profile.username },
                blocked,
              })
            }
            accessibilityRole="button"
            accessibilityLabel="More options"
            accessibilityHint="Report or block"
            style={styles.more}>
            <Icon name="more" color={t.ink} size={22} />
          </Pressable>
        )}
      </View>
      {body}
      <ContentMenu target={menu.target} onClose={menu.close} onDone={refresh} />
    </SafeAreaView>
  );
}

function PersonBody({
  profile,
  data,
  fetchedAt,
  failed,
  refreshing,
  onRefresh,
}: {
  profile: PersonProfile;
  data: PersonData;
  fetchedAt: number;
  failed: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const t = useNiklTheme();
  const social = useSocial();
  const { width } = useWindowDimensions();
  const hidden = useHidden();
  const following = social.isFollowingUser(profile.user_id, profile.i_follow, fetchedAt);
  const followers = adjustCount(profile.followers, profile.i_follow, following);
  const posts = data.posts.filter((p) => !hidden.posts.has(p.id));
  const name = profile.name ?? profile.username;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.muted} colors={[t.accent]} />}>
      <View style={styles.headPad}>
        <ProfileHeader profile={profile} posts={posts.length} followers={followers}>
          {profile.is_me ? (
            <Button label="Go to your profile" kind="secondary" onPress={() => router.navigate('/profile')} />
          ) : (
            <View style={styles.actions}>
              <View style={styles.grow}>
                <FollowButton following={following} name={name} onPress={() => social.setFollowUser(profile.user_id, !following)} />
              </View>
              {profile.follows_me && (
                <View style={[styles.followsYou, { backgroundColor: t.surface2 }]} accessible accessibilityLabel={`${name} follows you`}>
                  <Text style={[styles.followsYouText, { color: t.muted }]}>Follows you</Text>
                </View>
              )}
            </View>
          )}
          {failed && (
            <T variant="small" style={{ color: t.warn }} accessibilityLiveRegion="polite">
              Couldn’t refresh. Showing what we had.
            </T>
          )}
        </ProfileHeader>
      </View>

      <View style={[styles.rule, { backgroundColor: t.hair }]} />
      {posts.length === 0 ? (
        <T variant="muted" style={styles.none}>
          {profile.is_me ? 'You haven’t posted yet.' : 'No posts yet.'}
        </T>
      ) : (
        <PersonPostGrid posts={posts} width={width} own={profile.is_me} />
      )}
    </ScrollView>
  );
}

/** You blocked this person: nothing of theirs shows until you unblock them. */
function BlockedBody({ profile, onChanged }: { profile: PersonProfile; onChanged: () => void }) {
  const t = useNiklTheme();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const unblock = async () => {
    setBusy(true);
    setProblem(null);
    const failed = await setBlock(profile.user_id, false);
    setBusy(false);
    if (failed) setProblem(failed);
    else onChanged();
  };
  return (
    <View style={styles.pad}>
      <EmptyState emoji="⛔" title={`You blocked @${profile.username}`} body="You can’t see each other’s posts, stories or profiles. They don’t know you blocked them." />
      <View style={styles.unblock}>
        <Button label={`Unblock @${profile.username}`} kind="secondary" busy={busy} onPress={unblock} />
        {problem && (
          <Text style={{ color: t.like, fontSize: fontSize.md }} accessibilityLiveRegion="polite">
            {problem}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { paddingLeft: space.lg, paddingRight: space.sm, paddingVertical: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.md },
  back: { width: touchTarget, height: touchTarget, borderRadius: touchTarget / 2, alignItems: 'center', justifyContent: 'center' },
  backGlyph: { fontSize: 22, fontWeight: '600' },
  topHandle: { flex: 1, fontSize: fontSize.lg + 1, fontWeight: '700' },
  more: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: space.xxl },
  headPad: { paddingHorizontal: space.lg, paddingBottom: space.lg },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grow: { flex: 1 },
  followsYou: { minHeight: touchTarget, borderRadius: radius.md, paddingHorizontal: space.md, justifyContent: 'center' },
  followsYouText: { fontSize: fontSize.md, fontWeight: '600' },
  rule: { height: StyleSheet.hairlineWidth, marginBottom: 2 },
  none: { textAlign: 'center', paddingVertical: space.xl, paddingHorizontal: space.lg },
  pad: { padding: space.lg },
  unblock: { gap: space.sm, marginTop: space.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
});
