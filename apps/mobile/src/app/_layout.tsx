import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { palette } from '@nikl/tokens';
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
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" options={{ presentation: 'modal' }} />
          <Stack.Screen name="profile-setup" options={{ gestureEnabled: false }} />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
