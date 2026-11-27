import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatEventWhen, formatTimeAgo } from '@nikl/utils';
import { openClub, openEvent, openPerson, PhotoCarousel, ReviewPill } from '@/components/feed';
import { ContentMenu, useContentMenu, type MenuOutcome } from '@/components/safety';
import { ClubAvatar, IconButton, PersonAvatar, VerifiedTick } from '@/components/social';
import { EmptyState } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { postPhotoPaths, usePost, type PostAuthorInfo, type PostData, type PostRow } from '@/lib/people';
import { useHidden } from '@/lib/safety';
import { adjustCount, useSocial } from '@/lib/social';
import { fontSize, radius, space, touchTarget, useNiklTheme } from '@/theme';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** One post on its own (opened from a profile grid): photos, caption, likes, the tagged event. */
export default function PostScreen() {
  const t = useNiklTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { connected, loading, refreshing, data, fetchedAt, refresh } = usePost(id);
  const hidden = useHidden();
  const gone = data?.post && (hidden.posts.has(data.post.id) || (data.author?.type === 'user' && hidden.users.has(data.author.id)));

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
        <ActivityIndicator color={t.muted} accessibilityLabel="Loading post" />
      </View>
    );
  } else if (!data || fetchedAt === null) {
    body = (
      <View style={styles.pad}>
        <EmptyState emoji="📡" title="Couldn’t load this post" body="Check your internet connection and try again." action={{ label: 'Try again', onPress: refresh }} />
      </View>
    );
  } else if (!data.post || !data.author || gone) {
    body = (
      <View style={styles.pad}>
        <EmptyState
          emoji="🔍"
          title="This post isn’t available"
          body="It may have been deleted, or it’s only for the author’s friends."
          action={{ label: 'Go to Home', onPress: () => router.navigate('/') }}
        />
      </View>
    );
  } else {
    body = <PostBody post={data.post} author={data.author} data={data} fetchedAt={fetchedAt} refreshing={refreshing} onRefresh={refresh} />;
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
        <Text style={[styles.topTitle, { color: t.ink }]} accessibilityRole="header">
          Post
        </Text>
      </View>
      {body}
    </SafeAreaView>
  );
}

function PostBody({
  post,
  author,
  data,
  fetchedAt,
  refreshing,
  onRefresh,
}: {
  post: PostRow;
  author: PostAuthorInfo;
  data: PostData;
  fetchedAt: number;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const t = useNiklTheme();
  const social = useSocial();
  const { session } = useAuth();
  const menu = useContentMenu();
  const mine = author.type === 'user' && author.id === session?.user.id;
  const liked = social.isLiked(post.id, data.liked, fetchedAt);
  const likes = adjustCount(data.likes, data.liked, liked);
  const event = post.events;
  const caption = post.caption?.trim() ?? '';
  const status = post.moderation_status;
  const openAuthor = () => (author.type === 'club' ? openClub(author.handle) : openPerson(author.handle));
  const onMenuDone = (outcome: MenuOutcome) => {
    if (outcome === 'deleted' || outcome === 'blocked') goBack();
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.muted} colors={[t.accent]} />}>
      <View style={styles.header}>
        <Pressable
          onPress={openAuthor}
          accessibilityRole="button"
          accessibilityLabel={`${author.handle}${author.type === 'club' && author.verified ? ', verified' : ''}`}
          accessibilityHint={author.type === 'club' ? 'Opens the club’s profile' : 'Opens their profile'}
          style={({ pressed }) => [styles.who, { opacity: pressed ? 0.7 : 1 }]}>
          {author.type === 'club' ? (
            <ClubAvatar name={author.name} logoUrl={author.logoUrl} category={author.category} size={32} />
          ) : (
            <PersonAvatar name={author.name} avatarUrl={author.avatarUrl} seed={author.id} size={32} />
          )}
          <Text style={[styles.handle, { color: t.ink }]} numberOfLines={1}>
            {author.handle}
          </Text>
          {author.type === 'club' && author.verified && <VerifiedTick />}
          {mine && (status === 'pending' || status === 'flagged') && <ReviewPill />}
          {mine && status === 'rejected' && <ReviewPill label="Removed" />}
        </Pressable>
        <IconButton
          icon="more"
          size={20}
          label="More options"
          hint={mine ? 'Delete this post' : 'Report this post'}
          onPress={() => menu.open({ type: 'post', id: post.id, mine, person: author.type === 'user' && !mine ? { id: author.id, handle: author.handle } : null })}
        />
      </View>

      {mine && status !== 'approved' && (
        <Text style={[styles.status, { color: status === 'rejected' ? t.like : t.muted, backgroundColor: t.surface2 }]}>
          {status === 'rejected'
            ? `Nikl removed this post: ${post.moderation_note ?? 'it broke the community guidelines.'} Only you can see it. You can delete it from ⋯.`
            : 'Only you can see this for now. It’ll appear for others once Nikl has checked it, usually within a few hours.'}
        </Text>
      )}

      <PhotoCarousel paths={postPhotoPaths(post)} recyclingKey={post.id} label={`Photo by ${author.handle}`} />

      <View style={styles.actions}>
        <IconButton icon={liked ? 'heartOn' : 'heart'} color={liked ? t.like : t.ink} label="Like" on={liked} onPress={() => social.setLike(post.id, !liked)} />
      </View>
      <Text style={[styles.likes, likes > 0 ? { color: t.ink, fontWeight: '700' } : { color: t.muted }]}>
        {likes > 0 ? `${likes.toLocaleString('en-IN')} ${likes === 1 ? 'like' : 'likes'}` : 'Be the first to like this'}
      </Text>

      {caption ? (
        <Text style={[styles.caption, { color: t.ink }]}>
          <Text style={{ fontWeight: '700' }}>{author.handle}</Text> {caption}
        </Text>
      ) : null}

      {event && (
        <Pressable
          onPress={() => openEvent(event.slug)}
          accessibilityRole="button"
          accessibilityLabel={`Tagged event: ${event.title}`}
          accessibilityHint="Opens the event"
          style={({ pressed }) => [styles.event, { borderColor: t.hair, opacity: pressed ? 0.8 : 1 }]}>
          <Text style={styles.eventEmoji}>📅</Text>
          <Text style={[styles.eventTitle, { color: t.ink }]} numberOfLines={2}>
            {event.title}
          </Text>
          <Text style={[styles.chevron, { color: t.muted }]}>›</Text>
        </Pressable>
      )}

      <Text style={[styles.time, { color: t.muted }]} accessibilityLabel={`Posted ${formatEventWhen(post.created_at)}${post.visibility === 'friends' ? ', friends only' : ''}`}>
        {formatTimeAgo(post.created_at, new Date(fetchedAt))}
        {post.visibility === 'friends' ? ' · Friends only' : ''}
      </Text>
      <ContentMenu target={menu.target} onClose={menu.close} onDone={onMenuDone} />
    </ScrollView>
  );
}

const PAD = space.md + 2;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { paddingHorizontal: space.lg, paddingVertical: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.md },
  back: { width: touchTarget, height: touchTarget, borderRadius: touchTarget / 2, alignItems: 'center', justifyContent: 'center' },
  backGlyph: { fontSize: 22, fontWeight: '600' },
  topTitle: { fontSize: fontSize.lg + 1, fontWeight: '700' },
  scroll: { paddingBottom: space.xxl },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: PAD - 4, paddingRight: space.xs },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: touchTarget },
  handle: { fontSize: fontSize.md, fontWeight: '700', flexShrink: 1 },
  status: { fontSize: fontSize.sm, lineHeight: 18, marginHorizontal: PAD, marginBottom: space.sm, padding: space.sm + 2, borderRadius: radius.md },
  actions: { flexDirection: 'row', paddingHorizontal: space.xs, paddingTop: 2 },
  likes: { fontSize: fontSize.md - 0.5, paddingHorizontal: PAD },
  caption: { fontSize: fontSize.md - 0.5, lineHeight: 19, paddingHorizontal: PAD, marginTop: space.xs },
  event: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: touchTarget + 4, marginHorizontal: PAD, marginTop: space.md, paddingHorizontal: space.md, borderWidth: 1, borderRadius: radius.md },
  eventEmoji: { fontSize: 18 },
  eventTitle: { flex: 1, fontSize: fontSize.md, fontWeight: '600' },
  chevron: { fontSize: 22 },
  time: { fontSize: 11.5, paddingHorizontal: PAD, marginTop: space.sm },
  pad: { padding: space.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
});
