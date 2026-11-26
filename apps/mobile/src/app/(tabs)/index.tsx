import { router } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CaughtUp, PostCard, StoriesRow, SuggestedClubs } from '@/components/feed';
import { EmptyState, Wordmark } from '@/components/ui';
import { useHomeFeed, type FeedPost, type HomeData } from '@/lib/feed';
import { space, useNiklTheme } from '@/theme';

type FeedItem = { type: 'post'; post: FeedPost } | { type: 'suggestions' };

/** Posts in order, with "Clubs you might like" after the second post (or the only one). */
function feedItems(data: HomeData): FeedItem[] {
  const items: FeedItem[] = [];
  const railAfter = Math.min(1, data.posts.length - 1);
  data.posts.forEach((post, i) => {
    items.push({ type: 'post', post });
    if (i === railAfter && data.suggestions.length > 0) items.push({ type: 'suggestions' });
  });
  return items;
}

const openExplore = () => router.navigate('/explore');

/** Home: club stories and the social feed of club posts, with booking one tap away. */
export default function HomeScreen() {
  const t = useNiklTheme();
  const { connected, loading, refreshing, data, failed, fetchedAt, refresh } = useHomeFeed();

  const topBar = (
    <View style={styles.topBar}>
      <Wordmark />
    </View>
  );

  let body;
  if (!connected) {
    body = (
      <View style={styles.pad}>
        <EmptyState emoji="🔌" title="Not connected yet" body="This copy of the app isn’t linked to Nikl’s server yet, so there are no posts to show." />
      </View>
    );
  } else if (loading || (refreshing && !data)) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={t.muted} accessibilityLabel="Loading your feed" />
      </View>
    );
  } else if (!data || fetchedAt === null) {
    body = (
      <View style={styles.pad}>
        <EmptyState
          emoji="📡"
          title="Couldn’t load your feed"
          body="Check your internet connection and try again."
          action={{ label: 'Try again', onPress: refresh }}
        />
      </View>
    );
  } else {
    const storyClubs = new Set(data.stories.map((c) => c.id));
    body = (
      <FlatList
        data={feedItems(data)}
        keyExtractor={(item) => (item.type === 'post' ? item.post.post_id : 'suggestions')}
        renderItem={({ item }) =>
          item.type === 'post' ? (
            <PostCard post={item.post} fetchedAt={fetchedAt} hasStory={storyClubs.has(item.post.club_id)} />
          ) : (
            <SuggestedClubs clubs={data.suggestions} fetchedAt={fetchedAt} />
          )
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.muted} colors={[t.accent]} />}
        ListHeaderComponent={
          <>
            <StoriesRow clubs={data.stories} />
            {failed && (
              <Text style={[styles.note, { color: t.warn }]} accessibilityLiveRegion="polite">
                Couldn’t refresh. Showing your last feed.
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.pad}>
              <EmptyState
                emoji="🌱"
                title="No posts yet"
                body="Clubs around Bhubaneswar are just getting started. Find something to do in Explore, or follow a few clubs."
                action={{ label: 'Open Explore', onPress: openExplore }}
              />
            </View>
            <SuggestedClubs clubs={data.suggestions} fetchedAt={fetchedAt} />
          </View>
        }
        ListFooterComponent={data.posts.length > 0 ? <CaughtUp /> : undefined}
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: t.app }]}>
      {topBar}
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: space.lg, paddingBottom: space.xs },
  pad: { padding: space.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  note: { paddingHorizontal: space.lg, paddingVertical: space.sm, fontSize: 13 },
  empty: { gap: space.sm },
});
