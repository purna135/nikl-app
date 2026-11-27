import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { palette } from '@nikl/tokens';
import { FlashBanner } from '@/components/flash';
import { AuthProvider } from '@/lib/auth';

export default function RootLayout() {
  const dark = useColorScheme() === 'dark';
  const p = dark ? palette.dark : palette.light;
  const base = dark ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, primary: p.accent, background: p.app, card: p.app, text: p.ink, border: p.hair },
  };

  return (
    <AuthProvider>
      <ThemeProvider value={theme}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <View style={styles.root}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" options={{ presentation: 'modal' }} />
            <Stack.Screen name="profile-setup" options={{ gestureEnabled: false }} />
            <Stack.Screen name="event/[slug]" />
            <Stack.Screen name="club/[handle]" />
            <Stack.Screen name="u/[username]" />
            <Stack.Screen name="post/[id]" />
            <Stack.Screen
              name="stories"
              options={{ presentation: 'fullScreenModal', animation: 'fade', contentStyle: { backgroundColor: '#000000' }, gestureEnabled: false }}
            />
            {/* Composers slide up but are ordinary screens, so a closing sheet never clashes with them. No swipe-back: it would lose the draft. */}
            <Stack.Screen name="create/post" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
            <Stack.Screen name="create/plan" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
          </Stack>
          <FlashBanner />
        </View>
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
