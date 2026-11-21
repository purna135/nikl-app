import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CATEGORIES } from '@nikl/utils';
import { EmptyState, Screen, T, Wordmark } from '@/components/ui';
import { radius, space, useNiklTheme } from '@/theme';

/** Home feed shell. Club posts and stories arrive in weeks 4–5. */
export default function HomeScreen() {
  const t = useNiklTheme();
  return (
    <Screen>
      <Wordmark />
      <View style={{ gap: space.xs }}>
        <T variant="small" style={{ fontWeight: '700', letterSpacing: 1, color: t.accent }}>
          BHUBANESWAR
        </T>
        <T variant="title">What&apos;s the scene this weekend?</T>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {CATEGORIES.map((c) => (
          <View key={c.id} style={[styles.chip, { backgroundColor: t.tints[c.tint] }]} accessibilityLabel={c.name}>
            <Text style={styles.chipEmoji}>{c.emoji}</Text>
            <Text style={[styles.chipText, { color: t.onTint }]}>{c.short}</Text>
          </View>
        ))}
      </ScrollView>

      <EmptyState
        emoji="📅"
        title="Your feed lives here"
        body="Posts and stories from the clubs you follow, with a Book button on every event. Coming as clubs join."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, paddingVertical: space.sm + 2, borderRadius: radius.md },
  chipEmoji: { fontSize: 16 },
  chipText: { fontSize: 14, fontWeight: '600' },
});
