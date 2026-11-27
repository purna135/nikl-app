import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AccessibilityInfo, ActivityIndicator, Animated, AppState, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View, type GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { firstUnseen, formatTimeAgo, nextStory, previousStory } from '@nikl/utils';
import { openClub, openEvent, openPerson, ReviewPill } from '@/components/feed';
import { ContentMenu, useContentMenu, type MenuOutcome } from '@/components/safety';
import { StoryCard, storyAction, storySticker, type StoryEvent } from '@/components/story-card';
import { ClubAvatar, Icon, PersonAvatar, VerifiedTick } from '@/components/social';
import { useHidden } from '@/lib/safety';
import { postPhotoUrl } from '@/lib/social';
import { isSeen, markSeen, sendSeen, storyTemplate, useStoryState, useViewerGroups, visibleStoryGroups, type Story, type StoryGroup } from '@/lib/stories';
import { fontSize, radius, space, touchTarget, useNiklTheme } from '@/theme';

/** Each story shows for this long, then the next one starts. */
const STORY_MS = 5000;
/** Holding longer than this pauses instead of counting as a tap. */
const HOLD_MS = 220;
/** Dragging down further than this closes the viewer. */
const CLOSE_DRAG = 110;

const WHITE = '#FFFFFF';

function close() {
  sendSeen();
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Full-screen stories, opened on one author (`author` = "club:<id>" or "user:<id>"), then on through the row. */
export default function StoriesScreen() {
  const { author } = useLocalSearchParams<{ author?: string }>();
  const { groups: loaded, failed, loadedAt } = useViewerGroups();
  const hidden = useHidden();
  const insets = useSafeAreaInsets();

  let body;
  let playing = false;
  if (loaded === null) {
    body = <ActivityIndicator color={WHITE} accessibilityLabel="Loading stories" style={styles.fill} />;
  } else {
    const groups = visibleStoryGroups(loaded, hidden);
    if (groups.length === 0) {
      body = (
        <View style={[styles.fill, styles.message]}>
          <Text style={styles.messageTitle}>{failed ? 'Couldn’t load stories' : 'No stories right now'}</Text>
          <Text style={styles.messageBody}>{failed ? 'Check your internet connection and try again.' : 'They last 24 hours. Check back later.'}</Text>
        </View>
      );
    } else {
      playing = true;
      body = <Player initialGroups={groups} startKey={author ?? groups[0]!.key} loadedAt={loadedAt} />;
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      {body}
      {!playing ? (
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close stories" style={[styles.closeAlone, { top: insets.top + space.sm }]}>
          <Icon name="close" color={WHITE} size={24} />
        </Pressable>
      ) : null}
    </View>
  );
}

type Position = { key: string; storyId: string };

function startAt(groups: StoryGroup[], key: string, seen: ReadonlySet<string>): Position {
  const group = groups.find((g) => g.key === key) ?? groups[0]!;
  const story = group.stories[firstUnseen(group.stories.map((s) => isSeen(s, seen)))]!;
  return { key: group.key, storyId: story.story_id };
}

function storyEvent(s: Story): StoryEvent | null {
  if (!s.event_slug || !s.event_title) return null;
  return {
    title: s.event_title,
    category: s.event_category ?? 'other',
    posterUrl: s.poster_url,
    startsAt: s.starts_at,
    area: s.area,
    isFree: s.is_free,
    minPricePaise: s.min_price_paise,
  };
}

/**
 * Plays the groups as they were when the viewer opened. Deleting a story or blocking someone here
 * removes it from this copy in the same step as moving on, so the position never points at a
 * story that's gone (and nothing is marked as seen by mistake).
 */
function Player({ initialGroups, startKey, loadedAt }: { initialGroups: StoryGroup[]; startKey: string; loadedAt: number }) {
  const t = useNiklTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { seen } = useStoryState();
  const menu = useContentMenu();
  const [groups, setGroups] = useState(initialGroups);
  const [at, setAt] = useState<Position>(() => startAt(initialGroups, startKey, seen));
  const [round, setRound] = useState(0);
  const [holding, setHolding] = useState(false);
  const [readyId, setReadyId] = useState<string | null>(null);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [screenReader, setScreenReader] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));
  const [dragY] = useState(() => new Animated.Value(0));

  const gi = Math.max(
    0,
    groups.findIndex((g) => g.key === at.key),
  );
  const group = groups[gi]!;
  const si = Math.max(
    0,
    group.stories.findIndex((s) => s.story_id === at.storyId),
  );
  const story = group.stories[si]!;
  const sizes = groups.map((g) => g.stories.length);
  const photo = postPhotoUrl(story.media_path);
  const event = storyEvent(story);
  const { kicker, note } = storyTemplate(story.template);
  const ready = !photo || readyId === story.story_id;
  const paused = holding || menu.target !== null || !appActive || screenReader || !ready;

  const goTo = (pos: { group: number; story: number } | null) => {
    if (!pos) return close();
    const g = groups[pos.group]!;
    setAt({ key: g.key, storyId: g.stories[pos.story]!.story_id });
    setRound((r) => r + 1);
  };
  const goNext = () => goTo(nextStory(sizes, { group: gi, story: si }));
  const goPrev = () => goTo(previousStory(sizes, { group: gi, story: si }));
  const nextGroup = () => goTo(nextStory(sizes, { group: gi, story: sizes[gi]! - 1 }));

  // The phone's settings: pause for screen readers (they move with swipes), less motion if asked.
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isScreenReaderEnabled().then((on) => active && setScreenReader(on), () => {});
    AccessibilityInfo.isReduceMotionEnabled().then((on) => active && setReduceMotion(on), () => {});
    const a = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    const b = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const c = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
    return () => {
      active = false;
      a.remove();
      b.remove();
      c.remove();
    };
  }, []);

  // Watched as soon as it shows; the database hears about it when the author's group ends.
  useEffect(() => {
    markSeen(story.story_id);
  }, [story.story_id]);
  useEffect(() => () => sendSeen(), [group.key]);

  // The progress bar: starts empty for each story (and when a story starts again)...
  const onFinished = useEffectEvent(() => goNext());
  useEffect(() => {
    progress.setValue(0);
  }, [progress, story.story_id, round]);
  // ...and fills over 5 seconds, holding still while paused.
  useEffect(() => {
    if (paused) return;
    let animation: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    progress.stopAnimation((value) => {
      if (cancelled) return;
      animation = Animated.timing(progress, { toValue: 1, duration: STORY_MS * (1 - value), easing: Easing.linear, useNativeDriver: false });
      animation.start(({ finished }) => {
        if (finished) onFinished();
      });
    });
    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [paused, progress, story.story_id, round]);

  // Taps, holds and swipes on the story itself (the buttons sit above and take their own taps).
  const gesture = useRef({ timer: null as ReturnType<typeof setTimeout> | null, held: false, moved: false, x0: 0, y0: 0, t0: 0 });
  const endGesture = () => {
    const g = gesture.current;
    if (g.timer) clearTimeout(g.timer);
    g.timer = null;
    setHolding(false);
  };
  const touch = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: (e: GestureResponderEvent) => {
      const g = gesture.current;
      g.held = false;
      g.moved = false;
      g.x0 = e.nativeEvent.pageX;
      g.y0 = e.nativeEvent.pageY;
      g.t0 = e.nativeEvent.timestamp;
      g.timer = setTimeout(() => {
        g.held = true;
        setHolding(true);
      }, HOLD_MS);
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const g = gesture.current;
      const dx = e.nativeEvent.pageX - g.x0;
      const dy = e.nativeEvent.pageY - g.y0;
      if (!g.moved && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        g.moved = true;
        setHolding(true);
      }
      if (!reduceMotion) dragY.setValue(Math.max(0, dy));
    },
    onResponderRelease: (e: GestureResponderEvent) => {
      const g = gesture.current;
      endGesture();
      const dx = e.nativeEvent.pageX - g.x0;
      const dy = e.nativeEvent.pageY - g.y0;
      const fast = dy / Math.max(1, e.nativeEvent.timestamp - g.t0) > 0.9;
      if (g.moved) {
        if (dy > CLOSE_DRAG || (fast && dy > 40)) return close();
        Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
        // Sideways swipes jump between people and clubs.
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) nextGroup();
          else goPrev();
        }
        return;
      }
      if (g.held) return;
      if (e.nativeEvent.pageX < width * 0.3) goPrev();
      else goNext();
    },
    onResponderTerminate: () => {
      endGesture();
      Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
    },
  };

  const openAuthor = () => {
    close();
    if (group.authorType === 'club') openClub(group.handle);
    else openPerson(group.handle);
  };
  const book = () => {
    if (!story.event_slug) return;
    const slug = story.event_slug;
    close();
    openEvent(slug);
  };
  const onMenuDone = (outcome: MenuOutcome) => {
    if (outcome !== 'deleted' && outcome !== 'blocked') return;
    const next = outcome === 'deleted' ? nextStory(sizes, { group: gi, story: si }) : nextStory(sizes, { group: gi, story: sizes[gi]! - 1 });
    if (!next) return close();
    const target = groups[next.group]!;
    const remaining = groups.flatMap((g) => {
      if (outcome === 'blocked') return g.key === group.key ? [] : [g];
      if (g.key !== group.key) return [g];
      const stories = g.stories.filter((s) => s.story_id !== story.story_id);
      return stories.length > 0 ? [{ ...g, stories }] : [];
    });
    setGroups(remaining);
    setAt({ key: target.key, storyId: target.stories[next.story]!.story_id });
    setRound((r) => r + 1);
  };

  const ago = formatTimeAgo(story.created_at, new Date(loadedAt || story.created_at));
  const spoken = [
    `Story ${si + 1} of ${group.stories.length} from ${group.handle}, ${ago === 'Just now' ? 'just now' : `${ago} ago`}.`,
    photo ? 'Photo.' : null,
    event ? `${event.title}. ${storySticker(event)}.` : null,
    note ? `Note: ${note}.` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Animated.View
      style={[
        styles.fill,
        {
          transform: [{ translateY: dragY }],
          opacity: dragY.interpolate({ inputRange: [0, 400], outputRange: [1, 0.4], extrapolate: 'clamp' }),
        },
      ]}>
      <View style={[styles.fill, { borderRadius: radius.md, overflow: 'hidden' }]}>
        <StoryCard
          key={story.story_id}
          event={event}
          kicker={kicker}
          note={note}
          photoUri={photo}
          onPhotoReady={() => setReadyId(story.story_id)}
        />
      </View>

      {/* The story itself: tap right for next, left for previous, hold to pause, swipe down to close. */}
      <View
        {...touch}
        style={StyleSheet.absoluteFill}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={spoken}
        accessibilityHint="Swipe up or down to move between stories"
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'escape' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'increment') goNext();
          else if (e.nativeEvent.actionName === 'decrement') goPrev();
          else close();
        }}
        onAccessibilityEscape={close}
      />

      <View style={[styles.top, { paddingTop: insets.top + space.sm }]} pointerEvents="box-none">
        <View style={styles.bars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {group.stories.map((s, i) => (
            <View key={s.story_id} style={styles.bar}>
              {i < si ? (
                <View style={[styles.barFill, { width: '100%' }]} />
              ) : i === si ? (
                <Animated.View style={[styles.barFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
              ) : null}
            </View>
          ))}
        </View>
        <View style={styles.head}>
          <Pressable
            onPress={openAuthor}
            accessibilityRole="button"
            accessibilityLabel={`${group.handle}${group.verified ? ', verified' : ''}`}
            accessibilityHint={group.authorType === 'club' ? 'Opens the club’s profile' : 'Opens their profile'}
            style={({ pressed }) => [styles.who, { opacity: pressed ? 0.7 : 1 }]}>
            {group.authorType === 'club' ? (
              <ClubAvatar name={group.name} logoUrl={group.avatarUrl} category={group.category ?? 'other'} size={32} />
            ) : (
              <PersonAvatar name={group.name} avatarUrl={group.avatarUrl} seed={group.authorId} size={32} />
            )}
            <Text style={styles.handle} numberOfLines={1}>
              {group.handle}
            </Text>
            {group.verified && <VerifiedTick />}
            <Text style={styles.ago}>{ago}</Text>
          </Pressable>
          {story.mine && story.under_review && <ReviewPill />}
          <Pressable
            onPress={() =>
              menu.open({
                type: 'story',
                id: story.story_id,
                mine: story.mine,
                person: group.authorType === 'user' && !story.mine ? { id: group.authorId, handle: group.handle } : null,
                mediaPath: story.media_path,
              })
            }
            accessibilityRole="button"
            accessibilityLabel="More options"
            accessibilityHint={story.mine ? 'Delete this story' : 'Report this story'}
            style={styles.iconButton}>
            <Icon name="more" color={WHITE} size={22} />
          </Pressable>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close stories" style={styles.iconButton}>
            <Icon name="close" color={WHITE} size={24} />
          </Pressable>
        </View>
      </View>

      {event && story.event_slug ? (
        <View style={[styles.foot, { paddingBottom: insets.bottom + space.lg }]} pointerEvents="box-none">
          <Pressable
            onPress={book}
            accessibilityRole="button"
            accessibilityLabel={`${storyAction(event)}: ${event.title}`}
            accessibilityHint="Opens the event"
            style={({ pressed }) => [styles.cta, { backgroundColor: t.accent, opacity: pressed ? 0.85 : 1 }]}>
            <Text style={[styles.ctaText, { color: t.onAccent }]}>🎟️ {storyAction(event)}</Text>
          </Pressable>
        </View>
      ) : null}

      <ContentMenu target={menu.target} onClose={menu.close} onDone={onMenuDone} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  fill: { flex: 1 },
  message: { alignItems: 'center', justifyContent: 'center', gap: space.sm, padding: space.xl },
  messageTitle: { color: WHITE, fontSize: fontSize.xl, fontWeight: '700', textAlign: 'center' },
  messageBody: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.md + 1, textAlign: 'center' },
  closeAlone: { position: 'absolute', right: space.sm, width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  top: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: space.sm + 2, backgroundColor: 'rgba(0,0,0,0.18)' },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: WHITE },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingTop: space.xs },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: touchTarget },
  handle: { color: WHITE, fontSize: fontSize.md, fontWeight: '700', flexShrink: 1, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
  ago: { color: 'rgba(255,255,255,0.8)', fontSize: fontSize.sm, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
  iconButton: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  foot: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: space.lg },
  cta: { minHeight: touchTarget + 8, paddingHorizontal: space.xl, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  ctaText: { fontSize: fontSize.lg, fontWeight: '700' },
});
