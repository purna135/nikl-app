import type { ReactNode } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PosterTile } from '@/components/event-card';
import { PersonAvatar } from '@/components/social';
import { T } from '@/components/ui';
import { postPhotoPaths, type PersonPost, type PersonProfile } from '@/lib/people';
import { postPhotoUrl } from '@/lib/social';
import { fontSize, radius, space, useNiklTheme } from '@/theme';

const GRID_GAP = 2;
const count = (n: number) => n.toLocaleString('en-IN');

export function openPost(id: string) {
  router.push({ pathname: '/post/[id]', params: { id } });
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

/**
 * The top of a person's profile (prototype SCREENS.profile): photo, posts / followers / following,
 * name, @username · area, bio. `followers` already includes this phone's own follow tap.
 */
export function ProfileHeader({ profile, posts, followers, children }: { profile: PersonProfile; posts: number; followers: number; children?: ReactNode }) {
  const name = profile.name ?? profile.username;
  return (
    <View style={styles.head}>
      <View style={styles.profRow}>
        <PersonAvatar name={name} avatarUrl={profile.avatar_url} seed={profile.user_id} size={82} />
        <View style={styles.stats}>
          <Stat value={count(posts)} label={posts === 1 ? 'post' : 'posts'} />
          <Stat value={count(followers)} label={followers === 1 ? 'follower' : 'followers'} />
          <Stat value={count(profile.following)} label="following" spoken={`Following ${profile.following}`} />
        </View>
      </View>
      <View style={styles.bio}>
        <T style={{ fontWeight: '700' }} accessibilityRole="header">
          {name}
        </T>
        <T variant="muted">{[`@${profile.username}`, profile.area].filter(Boolean).join(' · ')}</T>
        {profile.bio ? <T style={styles.bioText}>{profile.bio}</T> : null}
      </View>
      {children}
    </View>
  );
}

/** What Nikl decided about one of your own posts, for the badge on its tile. */
function statusBadge(post: PersonPost): { text: string; tone: 'warn' | 'bad' } | null {
  if (post.moderation_status === 'pending' || post.moderation_status === 'flagged') return { text: 'Under review', tone: 'warn' };
  if (post.moderation_status === 'rejected') return { text: 'Removed', tone: 'bad' };
  return null;
}

/**
 * A person's posts, three to a row. On your own profile (`own`), posts being checked say
 * "Under review" and removed ones say "Removed" with Nikl's reason underneath.
 */
export function PersonPostGrid({ posts, width, own = false }: { posts: PersonPost[]; width: number; own?: boolean }) {
  const t = useNiklTheme();
  const size = Math.floor((width - GRID_GAP * 2) / 3);
  const removed = own ? posts.filter((p) => p.moderation_status === 'rejected') : [];

  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.grid}>
        {posts.map((post) => {
          const paths = postPhotoPaths(post);
          // A removed post's photos were deleted by Nikl, so don't try to show them.
          const photo = post.moderation_status === 'rejected' ? null : postPhotoUrl(paths[0]);
          const event = post.events;
          const badge = own ? statusBadge(post) : null;
          const label = [
            post.caption?.trim() || (event ? `Post about ${event.title}` : 'Post'),
            paths.length > 1 ? `${paths.length} photos` : null,
            post.visibility === 'friends' ? 'Friends only' : null,
            badge?.text,
          ]
            .filter(Boolean)
            .join(', ');
          return (
            <Pressable
              key={post.id}
              onPress={() => openPost(post.id)}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityHint="Opens the post"
              style={({ pressed }) => [{ width: size, height: size, opacity: pressed ? 0.85 : 1, backgroundColor: t.surface2 }]}>
              {photo ? (
                <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} recyclingKey={post.id} />
              ) : event ? (
                <PosterTile posterUrl={event.poster_url} category={event.category} emojiSize={28} recyclingKey={post.id} style={StyleSheet.absoluteFill} />
              ) : null}
              {paths.length > 1 && (
                <View style={styles.multi}>
                  <Text style={styles.multiText}>⧉</Text>
                </View>
              )}
              {badge && (
                <View style={[styles.badge, { backgroundColor: badge.tone === 'bad' ? t.like : 'rgba(0,0,0,0.6)' }]}>
                  <Text style={styles.badgeText}>{badge.text}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      {removed.map((post) => (
        <Text key={post.id} style={[styles.removed, { color: t.muted }]}>
          <Text style={{ color: t.like, fontWeight: '700' }}>Removed: </Text>
          {post.moderation_note ?? 'It broke the community guidelines.'}
          {post.caption ? ` (“${post.caption.trim().slice(0, 40)}${post.caption.trim().length > 40 ? '…' : ''}”)` : ''}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { gap: space.md },
  profRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  stats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: fontSize.lg + 1, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: fontSize.sm },
  bio: { gap: 2 },
  bioText: { marginTop: space.xs, lineHeight: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  multi: { position: 'absolute', top: 6, right: 6 },
  multiText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  badge: { position: 'absolute', left: 4, right: 4, bottom: 4, borderRadius: radius.sm, paddingVertical: 3, alignItems: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: fontSize.xs, fontWeight: '700' },
  removed: { fontSize: fontSize.sm, lineHeight: 18 },
});
