import { useRef, useState } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import { formatEventDay, formatEventTime, formatEventWhen, formatTimeAgo, priceSummary } from '@nikl/utils';
import { PosterTile } from '@/components/event-card';
import type { MenuTarget } from '@/components/safety';
import { ClubAvatar, FollowButton, IconButton, PersonAvatar, SmallButton, VerifiedTick, type StoryRing } from '@/components/social';
import { Button } from '@/components/ui';
import { categoryLook } from '@/lib/explore';
import { postAuthor, type FeedPost, type Me, type SuggestedClub } from '@/lib/feed';
import { adjustCount, postPhotoUrl, shareEvent, useSocial } from '@/lib/social';
import { ringFor, type StoryGroup } from '@/lib/stories';
import { fontSize, radius, space, touchTarget, useNiklTheme } from '@/theme';

export function openClub(handle: string) {
  router.push({ pathname: '/club/[handle]', params: { handle } });
}

export function openPerson(username: string) {
  router.push({ pathname: '/u/[username]', params: { username } });
}

export function openEvent(slug: string) {
  router.push({ pathname: '/event/[slug]', params: { slug } });
}

/** Opens the story viewer at one author's stories (key "club:<id>" or "user:<id>"). */
export function openStories(author: string) {
  router.push({ pathname: '/stories', params: { author } });
}

const likesLabel = (n: number) => `${n.toLocaleString('en-IN')} ${n === 1 ? 'like' : 'likes'}`;

/** Captions longer than this start folded to three lines, with "more" to open them. */
const LONG_CAPTION = 140;

/** Story circles: big and easy to tap, like Instagram (founder's request, 27 Nov 2026). */
const STORY_SIZE = 74;

/**
 * The stories row: "Your plans" first (signed in), then one ring per author with live stories.
 * Accent ring while any of their stories is new to you, grey once you've seen them all.
 */
export function StoriesRow({ groups, seen, me, signedIn }: { groups: StoryGroup[]; seen: ReadonlySet<string>; me: Me | null; signedIn: boolean }) {
  const t = useNiklTheme();
  const mine = groups.find((g) => g.mine) ?? null;
  const others = groups.filter((g) => !g.mine);
  if (!signedIn && others.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.storiesScroll, { borderBottomColor: t.hair }]}
      contentContainerStyle={styles.stories}>
      {signedIn && <YourPlansBubble me={me} group={mine} seen={seen} />}
      {others.map((g) => {
        const ring = ringFor(g, seen);
        return (
          <Pressable
            key={g.key}
            onPress={() => openStories(g.key)}
            accessibilityRole="button"
            accessibilityLabel={`${g.name}${g.verified ? ', verified' : ''}. ${ring === 'unseen' ? 'New story' : 'Story, seen'}`}
            accessibilityHint="Opens the story"
            style={({ pressed }) => [styles.story, { opacity: pressed ? 0.8 : 1 }]}>
            {g.authorType === 'club' ? (
              <ClubAvatar name={g.name} logoUrl={g.avatarUrl} category={g.category ?? 'other'} size={STORY_SIZE} ring={ring} />
            ) : (
              <PersonAvatar name={g.name} avatarUrl={g.avatarUrl} seed={g.authorId} size={STORY_SIZE} ring={ring} />
            )}
            <Text style={[styles.storyName, { color: ring === 'unseen' ? t.ink : t.muted }]} numberOfLines={1}>
              {g.handle}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Your own bubble: your stories if you have any live, otherwise a + to share your plans. */
function YourPlansBubble({ me, group, seen }: { me: Me | null; group: StoryGroup | null; seen: ReadonlySet<string> }) {
  const t = useNiklTheme();
  const name = me?.name ?? me?.username ?? 'You';
  return (
    <Pressable
      onPress={() => (group ? openStories(group.key) : router.push('/create/plan'))}
      accessibilityRole="button"
      accessibilityLabel={group ? 'Your plans. Your story' : 'Your plans. Share where you’re going'}
      accessibilityHint={group ? 'Opens your story' : 'Pick an event you’re going to and share it for 24 hours'}
      style={({ pressed }) => [styles.story, { opacity: pressed ? 0.8 : 1 }]}>
      <View>
        <PersonAvatar name={name} avatarUrl={me?.avatar_url ?? null} seed={me?.id ?? 'me'} size={STORY_SIZE} ring={group ? ringFor(group, seen) : false} />
        {!group && (
          <View style={[styles.plus, { backgroundColor: t.accent, borderColor: t.app }]}>
            <Text style={[styles.plusGlyph, { color: t.onAccent }]}>+</Text>
          </View>
        )}
      </View>
      <Text style={[styles.storyName, { color: t.ink }]} numberOfLines={1}>
        Your plans
      </Text>
    </Pressable>
  );
}

/** The soft category tile with the event's title, for event posts without a poster. */
function TitleArt({ title, category }: { title: string; category: string }) {
  const t = useNiklTheme();
  const look = categoryLook(category);
  return (
    <View style={[styles.art, { backgroundColor: t.tints[look.tint] }]}>
      <View style={[styles.sticker, { backgroundColor: t.app }]}>
        <Text style={styles.stickerEmoji}>{look.emoji}</Text>
      </View>
      <Text style={[styles.artTitle, { color: t.onTint }]} numberOfLines={3}>
        {title}
      </Text>
    </View>
  );
}

/** A person's photos, side by side: swipe between them. One photo is just the photo. */
export function PhotoCarousel({ paths, recyclingKey, label }: { paths: string[]; recyclingKey: string; label: string }) {
  const t = useNiklTheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollViewInstance>(null);
  const urls = paths.map(postPhotoUrl).filter((u): u is string => u !== null);
  if (urls.length === 0) return null;
  if (urls.length === 1) {
    return (
      <View accessible accessibilityRole="image" accessibilityLabel={label}>
        <Image source={{ uri: urls[0] }} style={styles.media} contentFit="cover" transition={150} recyclingKey={recyclingKey} />
      </View>
    );
  }
  const show = (i: number) => {
    const next = Math.max(0, Math.min(urls.length - 1, i));
    scroller.current?.scrollTo({ x: next * width, animated: true });
    setIndex(next);
  };
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${label}, photo ${index + 1} of ${urls.length}`}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => show(e.nativeEvent.actionName === 'increment' ? index + 1 : index - 1)}>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}>
        {urls.map((uri, i) => (
          <Image key={`${i}-${uri}`} source={{ uri }} style={[styles.media, { width }]} contentFit="cover" transition={150} recyclingKey={`${recyclingKey}-${i}`} />
        ))}
      </ScrollView>
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {index + 1}/{urls.length}
        </Text>
      </View>
      <View style={styles.dots}>
        {urls.map((uri, i) => (
          <View key={`${i}-${uri}`} style={[styles.dot, { backgroundColor: i === index ? t.accent : t.line }]} />
        ))}
      </View>
    </View>
  );
}

/** "Under review": on your own posts and stories until Nikl has checked them. */
export function ReviewPill({ label = 'Under review' }: { label?: string }) {
  const t = useNiklTheme();
  return (
    <View style={[styles.pill, { backgroundColor: t.surface2 }]}>
      <Text style={[styles.pillText, { color: t.warn }]}>{label}</Text>
    </View>
  );
}

/**
 * A post in the home feed, by a club or a person: header, photo(s) or poster, event strip, actions,
 * likes, caption. `ring` is the author's story ring; `onMore` opens the ⋯ menu.
 */
export function PostCard({
  post,
  photos,
  fetchedAt,
  ring,
  onMore,
}: {
  post: FeedPost;
  photos: string[] | undefined;
  fetchedAt: number;
  ring: StoryRing;
  onMore: (target: MenuTarget) => void;
}) {
  const t = useNiklTheme();
  const social = useSocial();
  const [expanded, setExpanded] = useState(false);
  const author = postAuthor(post);
  if (!author) return null;

  const isClub = author.type === 'club';
  const following = isClub ? social.isFollowing(author.id, post.following, fetchedAt) : social.isFollowingUser(author.id, post.following, fetchedAt);
  const liked = social.isLiked(post.post_id, post.liked, fetchedAt);
  const likes = adjustCount(post.like_count, post.liked, liked);
  const slug = post.event_slug;
  // People's posts stay after their event is over; the strip and booking only show while it's on.
  const eventOn = Boolean(slug && (isClub || post.starts_at));
  const eventId = eventOn ? post.event_id : null;
  const saved = eventId ? social.isSaved(eventId, post.saved, fetchedAt) : false;
  const title = post.event_title ?? author.name;
  const category = post.event_category ?? (isClub ? author.category : 'other');
  const place = [post.venue_name, post.area].filter(Boolean).join(', ');
  const sub = isClub && post.suggested && !following ? 'Suggested for you' : place || (isClub ? author.name : author.name !== author.handle ? author.name : '');
  const price = priceSummary(post.is_free, post.min_price_paise);
  const action = price === 'Free' ? 'RSVP' : 'Book';
  const caption = post.caption?.trim() ?? '';
  const folded = caption.length > LONG_CAPTION && !expanded;
  const pending = post.mine && post.under_review;
  const openAuthor = () => (isClub ? openClub(author.handle) : openPerson(author.handle));
  const follow = () => (isClub ? social.setFollow(author.id, true) : social.setFollowUser(author.id, true));

  let art = null;
  if (!isClub) {
    art = <PhotoCarousel paths={photos ?? (post.media_path ? [post.media_path] : [])} recyclingKey={post.post_id} label={`Photo by ${author.handle}`} />;
  } else {
    const photo = postPhotoUrl(post.media_path);
    if (photo) {
      art = <Image source={{ uri: photo }} style={styles.media} contentFit="cover" transition={150} recyclingKey={post.post_id} />;
    } else if (slug && post.poster_url) {
      art = <PosterTile posterUrl={post.poster_url} category={category} recyclingKey={post.post_id} style={styles.media} />;
    } else if (slug) {
      art = <TitleArt title={title} category={category} />;
    }
    if (art) {
      art =
        slug && eventOn ? (
          <Pressable onPress={() => openEvent(slug)} accessibilityRole="button" accessibilityLabel={title} accessibilityHint="Opens the event">
            {art}
          </Pressable>
        ) : (
          <View accessible accessibilityRole="image" accessibilityLabel={`Photo from ${author.name}`}>
            {art}
          </View>
        );
    }
  }

  return (
    <View style={[styles.post, { borderBottomColor: t.hair }]}>
      <View style={styles.header}>
        <Pressable
          onPress={openAuthor}
          accessibilityRole="button"
          accessibilityLabel={`${author.handle}${isClub && author.verified ? ', verified' : ''}${sub ? `. ${sub}` : ''}${pending ? '. Under review' : ''}`}
          accessibilityHint={isClub ? 'Opens the club’s profile' : 'Opens their profile'}
          style={({ pressed }) => [styles.headerMain, { opacity: pressed ? 0.7 : 1 }]}>
          {isClub ? (
            <ClubAvatar name={author.name} logoUrl={author.logoUrl} category={author.category} size={32} ring={ring} />
          ) : (
            <PersonAvatar name={author.name} avatarUrl={author.avatarUrl} seed={author.id} size={32} ring={ring} />
          )}
          <View style={styles.headerText}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: t.ink }]} numberOfLines={1}>
                {author.handle}
              </Text>
              {isClub && author.verified && <VerifiedTick />}
              {pending && <ReviewPill />}
            </View>
            {sub ? (
              <Text style={[styles.sub, { color: t.muted }]} numberOfLines={1}>
                {sub}
              </Text>
            ) : null}
          </View>
        </Pressable>
        {!following && !post.mine && (
          <Pressable
            onPress={follow}
            accessibilityRole="button"
            accessibilityLabel={`Follow ${author.name}`}
            style={({ pressed }) => [styles.followLink, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[styles.followLinkText, { color: t.accent }]}>Follow</Text>
          </Pressable>
        )}
        <IconButton
          icon="more"
          size={20}
          label="More options"
          hint={post.mine ? 'Delete this post' : 'Report this post'}
          onPress={() =>
            onMore({
              type: 'post',
              id: post.post_id,
              mine: post.mine,
              person: isClub ? null : { id: author.id, handle: author.handle },
            })
          }
        />
      </View>

      {art}

      {pending && (
        <Text style={[styles.reviewNote, { color: t.muted, backgroundColor: t.surface2 }]}>
          Only you can see this for now. It’ll appear for others once Nikl has checked it, usually within a few hours.
        </Text>
      )}

      {slug && eventOn && (
        <View style={[styles.strip, { borderBottomColor: t.hair }]}>
          <View style={[styles.stripIcon, { backgroundColor: t.surface2 }]} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Text style={styles.stripEmoji}>📅</Text>
          </View>
          <View style={styles.stripText}>
            <Text style={[styles.stripWhen, { color: t.ink }]} numberOfLines={1}>
              {isClub ? (post.starts_at ? `${formatEventDay(post.starts_at)} · ${formatEventTime(post.starts_at)}` : title) : title}
            </Text>
            <Text style={[styles.stripMeta, { color: t.muted }]} numberOfLines={1}>
              {[!isClub && post.starts_at ? formatEventDay(post.starts_at) : null, post.area, price].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <SmallButton label={action} onPress={() => openEvent(slug)} accessibilityLabel={`${action}: ${title}`} />
        </View>
      )}

      <View style={styles.actions}>
        <IconButton
          icon={liked ? 'heartOn' : 'heart'}
          color={liked ? t.like : t.ink}
          label="Like"
          on={liked}
          onPress={() => social.setLike(post.post_id, !liked)}
        />
        {slug && eventOn && <IconButton icon="comment" label="Comments" hint="Opens the event" onPress={() => openEvent(slug)} />}
        {slug && eventOn && <IconButton icon="share" label="Share" hint="Shares a link to the event" onPress={() => shareEvent(title, slug)} />}
        <View style={styles.grow} />
        {eventId && (
          <IconButton
            icon={saved ? 'bookmarkOn' : 'bookmark'}
            label="Save event"
            on={saved}
            onPress={() => social.setSave(eventId, !saved)}
          />
        )}
      </View>

      <Text style={[styles.likes, likes > 0 ? { color: t.ink, fontWeight: '700' } : { color: t.muted }]}>
        {likes > 0 ? likesLabel(likes) : 'Be the first to like this'}
      </Text>

      {caption ? (
        <View style={styles.captionBox}>
          <Text style={[styles.caption, { color: t.ink }]} numberOfLines={folded ? 3 : undefined}>
            <Text style={styles.captionHandle} onPress={openAuthor} accessibilityRole="link">
              {author.handle}
            </Text>{' '}
            {caption}
          </Text>
          {folded && (
            <Pressable
              onPress={() => setExpanded(true)}
              accessibilityRole="button"
              accessibilityLabel="Show the full caption"
              hitSlop={{ top: 12, bottom: 12 }}
              style={styles.more}>
              <Text style={[styles.caption, { color: t.muted }]}>more</Text>
            </Pressable>
          )}
        </View>
      ) : null}

      <Text style={[styles.time, { color: t.muted }]} accessibilityLabel={`Posted ${formatEventWhen(post.created_at)}`}>
        {formatTimeAgo(post.created_at, new Date(fetchedAt))}
      </Text>
    </View>
  );
}

/** "Clubs you might like": a sideways rail of clubs with a Follow button each. */
export function SuggestedClubs({ clubs, fetchedAt }: { clubs: SuggestedClub[]; fetchedAt: number }) {
  const t = useNiklTheme();
  const social = useSocial();
  if (clubs.length === 0) return null;
  return (
    <View style={[styles.sugg, { borderBottomColor: t.hair }]}>
      <Text style={[styles.suggTitle, { color: t.ink }]} accessibilityRole="header">
        Clubs you might like
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {clubs.map((c) => {
          // Everything suggested is a club you didn't follow when the list loaded.
          const following = social.isFollowing(c.club_id, false, fetchedAt);
          const kind = c.kind ?? categoryLook(c.category).name;
          return (
            <View key={c.club_id} style={[styles.card, { borderColor: t.line }]}>
              <Pressable
                onPress={() => openClub(c.handle)}
                accessibilityRole="button"
                accessibilityLabel={`${c.name}${c.verified ? ', verified' : ''}, ${kind}`}
                accessibilityHint="Opens the club’s profile"
                style={({ pressed }) => [styles.cardMain, { opacity: pressed ? 0.8 : 1 }]}>
                <ClubAvatar name={c.name} logoUrl={c.logo_url} category={c.category} size={64} />
                <View style={styles.nameRow}>
                  <Text style={[styles.cardHandle, { color: t.ink }]} numberOfLines={1}>
                    {c.handle}
                  </Text>
                  {c.verified && <VerifiedTick />}
                </View>
                <Text style={[styles.cardKind, { color: t.muted }]} numberOfLines={1}>
                  {kind}
                </Text>
              </Pressable>
              <FollowButton size="sm" following={following} name={c.name} onPress={() => social.setFollow(c.club_id, !following)} />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** The end of the feed. */
export function CaughtUp() {
  const t = useNiklTheme();
  return (
    <View style={styles.caught}>
      <View style={[styles.ok, { backgroundColor: t.surface2 }]} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={[styles.okGlyph, { color: t.ink }]}>✓</Text>
      </View>
      <Text style={[styles.caughtTitle, { color: t.ink }]} accessibilityRole="header">
        You’re all caught up
      </Text>
      <Text style={[styles.caughtBody, { color: t.muted }]}>You’ve seen the newest posts from clubs and people you follow. There’s more to do in Explore.</Text>
      <View style={styles.caughtAction}>
        <Button label="Explore plans" kind="secondary" onPress={() => router.navigate('/explore')} />
      </View>
    </View>
  );
}

const PAD = space.md + 2;

const styles = StyleSheet.create({
  storiesScroll: { flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth },
  stories: { gap: space.md, paddingHorizontal: PAD, paddingTop: space.xs, paddingBottom: space.md },
  story: { width: STORY_SIZE + 12, alignItems: 'center', gap: 6 },
  storyName: { fontSize: 12, maxWidth: STORY_SIZE + 12 },
  plus: { position: 'absolute', right: 2, bottom: 2, width: 26, height: 26, borderRadius: 13, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  plusGlyph: { fontSize: 17, fontWeight: '800', lineHeight: 19, marginTop: -1 },
  post: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: PAD },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: PAD - 4, paddingRight: space.xs, paddingVertical: space.xs + 2 },
  headerMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: touchTarget },
  headerText: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, maxWidth: '100%' },
  name: { fontSize: fontSize.md, fontWeight: '700', flexShrink: 1 },
  sub: { fontSize: fontSize.sm - 0.5 },
  followLink: { minHeight: touchTarget, minWidth: touchTarget, paddingHorizontal: space.sm, alignItems: 'center', justifyContent: 'center' },
  followLinkText: { fontSize: fontSize.md, fontWeight: '700' },
  pill: { borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 },
  pillText: { fontSize: fontSize.xs, fontWeight: '700' },
  media: { width: '100%', aspectRatio: 4 / 5 },
  counter: { position: 'absolute', top: space.md, right: space.md, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.pill, paddingHorizontal: space.sm + 2, paddingVertical: 3 },
  counterText: { color: '#FFFFFF', fontSize: fontSize.sm, fontWeight: '600', fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingTop: space.sm },
  dot: { width: 6, height: 6, borderRadius: 3 },
  reviewNote: { fontSize: fontSize.sm, lineHeight: 18, marginHorizontal: PAD, marginTop: space.sm, padding: space.sm + 2, borderRadius: radius.md },
  art: { width: '100%', aspectRatio: 4 / 5, justifyContent: 'flex-end', padding: space.lg },
  sticker: { position: 'absolute', top: space.lg + 2, right: space.lg + 2, width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', opacity: 0.85 },
  stickerEmoji: { fontSize: 34 },
  artTitle: { fontSize: 34, lineHeight: 36, fontWeight: '800', letterSpacing: -1, maxWidth: '85%' },
  strip: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, paddingHorizontal: PAD, paddingVertical: space.sm + 2, borderBottomWidth: StyleSheet.hairlineWidth },
  stripIcon: { width: 36, height: 36, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  stripEmoji: { fontSize: 18 },
  stripText: { flex: 1, minWidth: 0 },
  stripWhen: { fontSize: fontSize.md - 0.5, fontWeight: '700' },
  stripMeta: { fontSize: fontSize.sm - 0.5 },
  actions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xs, paddingTop: 2 },
  grow: { flex: 1 },
  likes: { fontSize: fontSize.md - 0.5, paddingHorizontal: PAD },
  captionBox: { paddingHorizontal: PAD, marginTop: space.xs },
  caption: { fontSize: fontSize.md - 0.5, lineHeight: 19 },
  captionHandle: { fontWeight: '700' },
  more: { alignSelf: 'flex-start', minWidth: touchTarget, paddingVertical: 2 },
  time: { fontSize: 11.5, paddingHorizontal: PAD, marginTop: space.xs },
  sugg: { paddingTop: PAD, paddingBottom: space.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  suggTitle: { fontSize: fontSize.md + 1, fontWeight: '700', paddingHorizontal: PAD, paddingBottom: space.sm + 2 },
  rail: { gap: space.sm + 2, paddingHorizontal: PAD },
  card: { width: 152, borderWidth: 1, borderRadius: radius.md + 2, paddingTop: space.lg, paddingHorizontal: space.sm + 2, paddingBottom: space.md, gap: space.sm, alignItems: 'center' },
  cardMain: { alignSelf: 'stretch', alignItems: 'center', gap: 4 },
  cardHandle: { fontSize: fontSize.md - 0.5, fontWeight: '700', flexShrink: 1 },
  cardKind: { fontSize: fontSize.sm - 0.5 },
  caught: { alignItems: 'center', gap: space.sm, paddingHorizontal: space.xxl, paddingTop: space.xl + 4, paddingBottom: space.xxl },
  ok: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  okGlyph: { fontSize: 24, fontWeight: '800' },
  caughtTitle: { fontSize: fontSize.lg, fontWeight: '700' },
  caughtBody: { fontSize: fontSize.md, textAlign: 'center', lineHeight: 20 },
  caughtAction: { alignSelf: 'stretch', marginTop: space.xs },
});
