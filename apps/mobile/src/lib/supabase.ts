import 'expo-sqlite/localStorage/install';
import { AppState } from 'react-native';
import { createNiklClient, isConfigured, type NiklClient } from '@nikl/supabase';

// Expo inlines EXPO_PUBLIC_* values at build time. They must be read with dot notation.
const env = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};

export const supabaseConfigured = isConfigured(env);

/**
 * The app's Supabase client, or null until apps/mobile/.env is filled in.
 * The session is stored with expo-sqlite's localStorage (Expo's recommended setup).
 */
export const supabase: NiklClient | null = isConfigured(env)
  ? createNiklClient(env, {
      auth: {
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Only refresh the session while the app is in the foreground.
if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
