import { useState } from 'react';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EventCard, PosterTile } from '@/components/event-card';
import { openEvent } from '@/components/feed';
import { ClubAvatar, FollowButton, VerifiedTick } from '@/components/social';
import { EmptyState, T } from '@/components/ui';
import { firstPhotoPath, useClubProfile, type ClubData, type ClubPost, type ClubProfile } from '@/lib/club';
import { categoryLook, useExploreEvents } from '@/lib/explore';
import { adjustCount, postPhotoUrl, useSocial } from '@/lib/social';
import { fontSize, radius, space, touchTarget, useNiklTheme } from '@/theme';

const GRID_GAP = 2;

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

const count = (n: number) => n.toLocaleString('en-IN');

/** A club's profile: who they are, follow, their posts and upcoming events. */
export default function ClubScreen() {
  const t = useNiklTheme();
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { connected, loading, refreshing, data, failed, fetchedAt, refresh } = useClubProfile(handle);
  const club = data?.club ?? null;

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
        <ActivityIndicator color={t.muted} accessibilityLabel="Loading club" />
      </View>
    );
  } else if (!data || fetchedAt === null) {
    body = (
      <View style={styles.pad}>
        <EmptyState
          emoji="📡"
          title="Couldn’t load this club"
          body="Check your internet connection and try again."
          action={{ label: 'Try again', onPress: refresh }}
        />
      </View>
    );
  } else if (!data.club) {
    body = (
      <View style={styles.pad}>
        <EmptyState
          emoji="🔍"
          title="We couldn’t find this club"
          body="It may have changed its name, or it isn’t on Nikl yet."
          action={{ label: 'Browse events', onPress: () => router.navigate('/explore') }}
        />
      </View>
    );
  } else {
    body = <ClubBody club={data.club} data={data} fetchedAt={fetchedAt} failed={failed} refreshing={refreshing} onRefresh={refresh} />;
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
        {club && (
          <View
            style={styles.topTitle}
            accessibilityRole="header"
            accessible
            accessibilityLabel={`${club.handle}${club.verified ? ', verified' : ''}`}>
            <Text style={[styles.topHandle, { color: t.ink }]} numberOfLines={1}>
              {club.handle}
            </Text>
            {club.verified && <VerifiedTick />}
          </View>
        )}
      </View>
      {body}
    </SafeAreaView>
  );
}

function ClubBody({
  club,
  data,
  fetchedAt,
  failed,
  refreshing,
  onRefresh,
}: {
  club: ClubProfile;
  data: ClubData;
  fetchedAt: number;
  failed: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const t = useNiklTheme();
  const social = useSocial();
  const explore = useExploreEvents();
  const [tab, setTab] = useState<'posts' | 'events'>('posts');

  const following = social.isFollowing(club.id, data.following, fetchedAt);
  const followers = adjustCount(data.followers, data.following, following);
  const events = explore.rows.filter((e) => e.club_handle === club.handle);
  const kind = club.kind ?? categoryLook(club.category).name;
  const rated = club.rating_count > 0 && club.rating_avg !== null;

  const refreshAll = () => {
    onRefresh();
    explore.refresh();
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={t.muted} colors={[t.accent]} />}>
      <View style={styles.head}>
        <View style={styles.profRow}>
          <ClubAvatar name={club.name} logoUrl={club.logo_url} category={club.category} size={82} />
          <View style={styles.stats}>
            <Stat value={explore.loading ? '–' : count(events.length)} label="upcoming" spoken={`${events.length} upcoming ${events.length === 1 ? 'event' : 'events'}`} />
            <Stat value={count(followers)} label={followers === 1 ? 'follower' : 'followers'} />
            {rated ? (
              <Stat value={`${club.rating_avg?.toFixed(1)}★`} label="rating" spoken={`Rated ${club.rating_avg?.toFixed(1)} out of 5`} />
            ) : (
              <Stat value="New" label="on Nikl" />
            )}
          </View>
        </View>

        <View style={styles.bio}>
          <View style={styles.nameRow}>
            <T style={{ fontWeight: '700' }} accessibilityRole="header">
              {club.name}
            </T>
            {club.verified && <VerifiedTick size={16} />}
          </View>
          <T variant="muted">{[kind, club.area].filter(Boolean).join(' · ')}</T>
          {club.bio ? <T style={styles.bioText}>{club.bio}</T> : null}
        </View>

        {club.review_status === 'approved' ? (
          <FollowButton following={following} name={club.name} onPress={() => social.setFollow(club.id, !following)} />
        ) : (
          // Only the club's own team sees a club that isn't approved yet (DECISIONS.md P15).
          <T variant="small">Waiting for Nikl’s approval. People can follow the club once it’s live.</T>
        )}
        {failed && (
          <T variant="small" style={{ color: t.warn }} accessibilityLiveRegion="polite">
            Couldn’t refresh. Showing what we had.
          </T>
        )}
      </View>

      <View style={[styles.tabs, { backgroundColor: t.surface2 }]} accessibilityRole="tablist">
        {(
          [
            ['posts', 'Posts'],
            ['events', 'Upcoming events'],
          ] as const
        ).map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => setTab(id)}
            hitSlop={{ top: 3, bottom: 3 }}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === id }}
            style={[styles.tab, tab === id && { backgroundColor: t.app }]}>
            <Text style={{ color: tab === id ? t.ink : t.muted, fontWeight: '600', fontSize: fontSize.md }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'posts' ? (
        <PostGrid posts={data.posts} />
      ) : (
        <View style={styles.events}>
          {explore.loading ? (
            <ActivityIndicator color={t.muted} accessibilityLabel="Loading events" style={{ marginTop: space.lg }} />
          ) : explore.error && explore.rows.length === 0 ? (
            <EmptyState emoji="📡" title="Couldn’t load events" body={explore.error} action={{ label: 'Try again', onPress: explore.refresh }} />
          ) : events.length === 0 ? (
            <T variant="muted" style={styles.none}>
              No upcoming events yet. Follow the club to see new ones in your feed.
            </T>
          ) : (
            events.map((e) => <EventCard key={e.event_id} event={e} />)
          )}
        </View>
      )}
    </ScrollView>
  );
}

function Stat({ value, label, spoken }: { value: string; label: string; spoken?: string }) {
  const t = useNiklTheme();
  return (
    <View style={styles.stat} accessible accessibilityLabel={spoken ?? `${value} ${label}`}>
      <Text style={[styles.statValue, { color: t.ink }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: t.muted }]}>{label}</Text>
    </View>
  );
}

/** Three photos or posters per row, edge to edge. Posts about an event open it. */
function PostGrid({ posts }: { posts: ClubPost[] }) {
  const t = useNiklTheme();
  const { width } = useWindowDimensions();
  const size = Math.floor((width - GRID_GAP * 2) / 3);

  if (posts.length === 0) {
    return (
      <T variant="muted" style={[styles.none, styles.pad]}>
        No posts yet.
      </T>
    );
  }

  return (
    <View style={styles.grid}>
      {posts.map((post) => {
        const photo = postPhotoUrl(firstPhotoPath(post));
        const event = post.events;
        const label = event?.title ?? post.caption ?? 'Post';
        let tile;
        if (photo) {
          tile = <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} recyclingKey={post.id} />;
        } else if (event) {
          tile = <PosterTile posterUrl={event.poster_url} category={event.category} emojiSize={28} recyclingKey={post.id} style={StyleSheet.absoluteFill} />;
        } else {
          tile = (
            <View style={[StyleSheet.absoluteFill, styles.textTile, { backgroundColor: t.surface2 }]}>
              <Text style={[styles.textTileText, { color: t.ink }]} numberOfLines={5}>
                {post.caption}
              </Text>
            </View>
          );
        }
        return event ? (
          <Pressable
            key={post.id}
            onPress={() => openEvent(event.slug)}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint="Opens the event"
            style={({ pressed }) => [{ width: size, height: size, opacity: pressed ? 0.85 : 1 }]}>
            {tile}
          </Pressable>
        ) : (
          <View key={post.id} style={{ width: size, height: size }} accessible accessibilityLabel={label}>
            {tile}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { paddingHorizontal: space.lg, paddingVertical: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.md },
  back: { width: touchTarget, height: touchTarget, borderRadius: touchTarget / 2, alignItems: 'center', justifyContent: 'center' },
  backGlyph: { fontSize: 22, fontWeight: '600' },
  topTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.xs + 1 },
  topHandle: { fontSize: fontSize.lg + 1, fontWeight: '700', flexShrink: 1 },
  scroll: { paddingBottom: space.xxl },
  head: { paddingHorizontal: space.lg, gap: space.md, paddingBottom: space.lg },
  profRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  stats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: fontSize.lg + 1, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: fontSize.sm },
  bio: { gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 1 },
  bioText: { marginTop: space.xs, lineHeight: 21 },
  tabs: { flexDirection: 'row', borderRadius: radius.md, padding: 3, gap: 3, marginHorizontal: space.lg, marginBottom: space.md },
  tab: { flex: 1, minHeight: touchTarget - 6, borderRadius: radius.md - 3, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  textTile: { padding: space.sm, justifyContent: 'center' },
  textTileText: { fontSize: fontSize.sm },
  events: { paddingHorizontal: space.lg, gap: space.md },
  none: { textAlign: 'center', paddingVertical: space.xl },
  pad: { padding: space.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
});
