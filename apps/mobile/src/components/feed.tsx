import { useState } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatEventDay, formatEventTime, formatEventWhen, formatTimeAgo, priceSummary } from '@nikl/utils';
import { PosterTile } from '@/components/event-card';
import { ClubAvatar, FollowButton, IconButton, SmallButton, VerifiedTick } from '@/components/social';
import { Button } from '@/components/ui';
import { categoryLook } from '@/lib/explore';
import type { FeedPost, StoryClub, SuggestedClub } from '@/lib/feed';
import { adjustCount, postPhotoUrl, shareEvent, useSocial } from '@/lib/social';
import { fontSize, radius, space, touchTarget, useNiklTheme } from '@/theme';

export function openClub(handle: string) {
  router.push({ pathname: '/club/[handle]', params: { handle } });
}

export function openEvent(slug: string) {
  router.push({ pathname: '/event/[slug]', params: { slug } });
}

const likesLabel = (n: number) => `${n.toLocaleString('en-IN')} ${n === 1 ? 'like' : 'likes'}`;

/** Captions longer than this start folded to three lines, with "more" to open them. */
const LONG_CAPTION = 140;

/** Live club stories, one ring per club. Tapping opens the club (the story viewer comes later). */
export function StoriesRow({ clubs }: { clubs: StoryClub[] }) {
  const t = useNiklTheme();
  if (clubs.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.storiesScroll, { borderBottomColor: t.hair }]}
      contentContainerStyle={styles.stories}>
      {clubs.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => openClub(c.handle)}
          accessibilityRole="button"
          accessibilityLabel={`${c.name} has a story`}
          accessibilityHint="Opens the club’s profile"
          style={({ pressed }) => [styles.story, { opacity: pressed ? 0.8 : 1 }]}>
          <ClubAvatar name={c.name} logoUrl={c.logo_url} category={c.category} size={58} ring />
          <Text style={[styles.storyName, { color: t.ink }]} numberOfLines={1}>
            {c.handle}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
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

/** A club post in the home feed: header, photo or poster, event strip, actions, likes, caption. */
export function PostCard({ post, fetchedAt, hasStory }: { post: FeedPost; fetchedAt: number; hasStory: boolean }) {
  const t = useNiklTheme();
  const social = useSocial();
  const [expanded, setExpanded] = useState(false);

  const following = social.isFollowing(post.club_id, post.following, fetchedAt);
  const liked = social.isLiked(post.post_id, post.liked, fetchedAt);
  const likes = adjustCount(post.like_count, post.liked, liked);
  const eventId = post.event_id;
  const slug = post.event_slug;
  const saved = eventId ? social.isSaved(eventId, post.saved, fetchedAt) : false;
  const title = post.event_title ?? post.club_name;
  const category = post.event_category ?? post.club_category;
  const photo = postPhotoUrl(post.media_path);
  const sub = post.suggested && !following ? 'Suggested for you' : [post.venue_name, post.area].filter(Boolean).join(', ') || post.club_name;
  const price = priceSummary(post.is_free, post.min_price_paise);
  const action = price === 'Free' ? 'RSVP' : 'Book';
  const caption = post.caption?.trim() ?? '';
  const folded = caption.length > LONG_CAPTION && !expanded;

  let art = null;
  if (photo) {
    art = <Image source={{ uri: photo }} style={styles.media} contentFit="cover" transition={150} recyclingKey={post.post_id} />;
  } else if (slug && post.poster_url) {
    art = <PosterTile posterUrl={post.poster_url} category={category} recyclingKey={post.post_id} style={styles.media} />;
  } else if (slug) {
    art = <TitleArt title={title} category={category} />;
  }

  return (
    <View style={[styles.post, { borderBottomColor: t.hair }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => openClub(post.club_handle)}
          accessibilityRole="button"
          accessibilityLabel={`${post.club_name}${post.club_verified ? ', verified' : ''}. ${sub}`}
          accessibilityHint="Opens the club’s profile"
          style={({ pressed }) => [styles.headerMain, { opacity: pressed ? 0.7 : 1 }]}>
          <ClubAvatar name={post.club_name} logoUrl={post.club_logo_url} category={post.club_category} size={32} ring={hasStory} />
          <View style={styles.headerText}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: t.ink }]} numberOfLines={1}>
                {post.club_handle}
              </Text>
              {post.club_verified && <VerifiedTick />}
            </View>
            <Text style={[styles.sub, { color: t.muted }]} numberOfLines={1}>
              {sub}
            </Text>
          </View>
        </Pressable>
        {!following && (
          <Pressable
            onPress={() => social.setFollow(post.club_id, true)}
            accessibilityRole="button"
            accessibilityLabel={`Follow ${post.club_name}`}
            style={({ pressed }) => [styles.followLink, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[styles.followLinkText, { color: t.accent }]}>Follow</Text>
          </Pressable>
        )}
      </View>

      {art &&
        (slug ? (
          <Pressable onPress={() => openEvent(slug)} accessibilityRole="button" accessibilityLabel={title} accessibilityHint="Opens the event">
            {art}
          </Pressable>
        ) : (
          <View accessible accessibilityRole="image" accessibilityLabel={`Photo from ${post.club_name}`}>
            {art}
          </View>
        ))}

      {slug && (
        <View style={[styles.strip, { borderBottomColor: t.hair }]}>
          <View style={[styles.stripIcon, { backgroundColor: t.surface2 }]} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Text style={styles.stripEmoji}>📅</Text>
          </View>
          <View style={styles.stripText}>
            <Text style={[styles.stripWhen, { color: t.ink }]} numberOfLines={1}>
              {post.starts_at ? `${formatEventDay(post.starts_at)} · ${formatEventTime(post.starts_at)}` : title}
            </Text>
            <Text style={[styles.stripMeta, { color: t.muted }]} numberOfLines={1}>
              {[post.area, price].filter(Boolean).join(' · ')}
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
        {slug && <IconButton icon="comment" label="Comments" hint="Opens the event" onPress={() => openEvent(slug)} />}
        {slug && <IconButton icon="share" label="Share" hint="Shares a link to the event" onPress={() => shareEvent(title, slug)} />}
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
            <Text style={styles.captionHandle}>{post.club_handle}</Text> {caption}
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
              <FollowButton size="sm" following={following} clubName={c.name} onPress={() => social.setFollow(c.club_id, !following)} />
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
      <Text style={[styles.caughtBody, { color: t.muted }]}>You’ve seen the newest posts from clubs around Bhubaneswar. There’s more to do in Explore.</Text>
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
  story: { width: 72, alignItems: 'center', gap: 5 },
  storyName: { fontSize: 11.5, maxWidth: 72 },
  post: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: PAD },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD - 4, paddingVertical: space.xs + 2 },
  headerMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: touchTarget },
  headerText: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, maxWidth: '100%' },
  name: { fontSize: fontSize.md, fontWeight: '700', flexShrink: 1 },
  sub: { fontSize: fontSize.sm - 0.5 },
  followLink: { minHeight: touchTarget, minWidth: touchTarget, paddingHorizontal: space.sm, alignItems: 'center', justifyContent: 'center' },
  followLinkText: { fontSize: fontSize.md, fontWeight: '700' },
  media: { width: '100%', aspectRatio: 4 / 5 },
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
