import { useEffect, useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * A short message at the top of the screen ("Posted", "Blocked"), shown for a few seconds over
 * whatever screen is open. Screen readers read it out.
 */

type Flash = { id: number; text: string };

let current: Flash | null = null;
let nextId = 0;
const listeners = new Set<() => void>();

const SHOW_MS = 4500;

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getFlash = () => current;

export function showFlash(text: string) {
  current = { id: ++nextId, text };
  emit();
  AccessibilityInfo.announceForAccessibility(text);
}

export function hideFlash() {
  if (!current) return;
  current = null;
  emit();
}

/** The message to show right now (it hides itself after a few seconds). */
export function useFlash(): Flash | null {
  const flash = useSyncExternalStore(subscribe, getFlash, getFlash);
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => {
      if (current?.id === flash.id) hideFlash();
    }, SHOW_MS);
    return () => clearTimeout(timer);
  }, [flash]);
  return flash;
}
