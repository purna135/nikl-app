import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from './supabase';

export type MyProfile = { name: string | null; username: string | null; area: string | null; interests: string[] };

/** Loads the signed-in person's public profile. */
export async function fetchMyProfile(userId: string): Promise<MyProfile | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('profiles').select('name, username, area, interests').eq('id', userId).maybeSingle();
  return data ?? null;
}

/** A profile counts as set up once it has a username (set by complete_profile). */
export const isProfileComplete = (p: MyProfile | null) => Boolean(p?.username);

/** The profile, refreshed every time the screen comes into focus (e.g. after set-up). */
export function useMyProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!userId) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      fetchMyProfile(userId).then((p) => {
        if (!active) return;
        setProfile(p);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [userId]),
  );

  return { profile, loading };
}
