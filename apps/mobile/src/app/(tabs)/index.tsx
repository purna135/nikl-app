import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CaughtUp, PostCard, StoriesRow, SuggestedClubs } from '@/components/feed';
import { ContentMenu, useContentMenu } from '@/components/safety';
import { Sheet, SheetRow, SheetTitle } from '@/components/sheet';
import { IconButton } from '@/components/social';
import { EmptyState, Wordmark } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useHomeFeed, type FeedPost, type HomeData } from '@/lib/feed';
import { useHidden } from '@/lib/safety';
import { authorKey, ringFor, useStoryState, visibleStoryGroups } from '@/lib/stories';
import { space, useNiklTheme } from '@/theme';

type FeedItem = { type: 'post'; post: FeedPost } | { type: 'suggestions' };

/** Posts in order, with "Clubs you might like" after the second post (or the only one). */
function feedItems(posts: FeedPost[], data: HomeData): FeedItem[] {
  const items: FeedItem[] = [];
  const railAfter = Math.min(1, posts.length - 1);
  posts.forEach((post, i) => {
    items.push({ type: 'post', post });
    if (i === railAfter && data.suggestions.length > 0) items.push({ type: 'suggestions' });
  });
  return items;
}

const openExplore = () => router.navigate('/explore');

/** Home: stories ("Your plans" first) and the social feed of club and people's posts, with booking one tap away. */
export default function HomeScreen() {
  const t = useNiklTheme();
  const { connected, loading, refreshing, data, failed, fetchedAt, refresh, signedIn } = useHomeFeed();
  const { loading: authLoading } = useAuth();
  const hidden = useHidden();
  const { seen } = useStoryState();
  const [creating, setCreating] = useState(false);
  const menu = useContentMenu();

  const openCreate = () => {
    if (authLoading) return;
    if (!signedIn) router.push('/login');
    else setCreating(true);
  };
  const create = (path: '/create/post' | '/create/plan') => {
    setCreating(false);
    router.push(path);
  };

  const topBar = (
    <View style={styles.topBar}>
      <Wordmark />
      <View style={styles.grow} />
      {connected && <IconButton icon="plus" label="Create" hint="Make a post or share your plans" onPress={openCreate} />}
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
    const posts = data.posts.filter((p) => !hidden.posts.has(p.post_id) && !(p.user_id && hidden.users.has(p.user_id)));
    const groups = visibleStoryGroups(data.stories, hidden);
    const rings = new Map(groups.map((g) => [g.key, ringFor(g, seen)]));
    const ringOf = (p: FeedPost) => {
      const id = p.author_type === 'club' ? p.club_id : p.user_id;
      return (id && rings.get(authorKey(p.author_type, id))) || false;
    };
    body = (
      <FlatList
        data={feedItems(posts, data)}
        keyExtractor={(item) => (item.type === 'post' ? item.post.post_id : 'suggestions')}
        renderItem={({ item }) =>
          item.type === 'post' ? (
            <PostCard post={item.post} photos={data.photos[item.post.post_id]} fetchedAt={fetchedAt} ring={ringOf(item.post)} onMore={menu.open} />
          ) : (
            <SuggestedClubs clubs={data.suggestions} fetchedAt={fetchedAt} />
          )
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.muted} colors={[t.accent]} />}
        ListHeaderComponent={
          <>
            <StoriesRow groups={groups} seen={seen} me={data.me} signedIn={signedIn} />
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
        ListFooterComponent={posts.length > 0 ? <CaughtUp /> : undefined}
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: t.app }]}>
      {topBar}
      {body}
      <Sheet visible={creating} onClose={() => setCreating(false)} label="Create">
        <SheetTitle>Create</SheetTitle>
        <SheetRow emoji="📸" label="New post" sub="Photos from a plan, for your followers" onPress={() => create('/create/post')} />
        <SheetRow emoji="🎟️" label="Share your plans" sub="Show friends an event you’re going to, for 24 hours" onPress={() => create('/create/plan')} />
        <SheetRow label="Cancel" onPress={() => setCreating(false)} />
      </Sheet>
      <ContentMenu target={menu.target} onClose={menu.close} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingLeft: space.lg, paddingRight: space.sm, paddingBottom: space.xs },
  grow: { flex: 1 },
  pad: { padding: space.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  note: { paddingHorizontal: space.lg, paddingVertical: space.sm, fontSize: 13 },
  empty: { gap: space.sm },
});
