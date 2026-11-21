import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { space, touchTarget, useNiklTheme } from '@/theme';

/** Web preview of the app (expo start --web). The real public website is apps/web. */
export default function AppTabs() {
  const t = useNiklTheme();
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList style={[styles.bar, { backgroundColor: t.app, borderTopColor: t.hair }]}>
        <TabTrigger name="index" href="/" asChild>
          <TabButton>Home</TabButton>
        </TabTrigger>
        <TabTrigger name="explore" href="/explore" asChild>
          <TabButton>Explore</TabButton>
        </TabTrigger>
        <TabTrigger name="tickets" href="/tickets" asChild>
          <TabButton>Tickets</TabButton>
        </TabTrigger>
        <TabTrigger name="profile" href="/profile" asChild>
          <TabButton>You</TabButton>
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, onPress, onLongPress }: TabTriggerSlotProps) {
  const t = useNiklTheme();
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} accessibilityRole="tab" accessibilityState={{ selected: isFocused }} style={styles.tab}>
      <View style={[styles.pill, isFocused && { backgroundColor: t.surface2 }]}>
        <Text style={{ color: isFocused ? t.ink : t.muted, fontWeight: isFocused ? '700' : '500' }}>{children}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, paddingVertical: space.sm },
  tab: { flex: 1, alignItems: 'center' },
  pill: { minHeight: touchTarget - 8, paddingHorizontal: space.lg, borderRadius: 999, justifyContent: 'center' },
});
