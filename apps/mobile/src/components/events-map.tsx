import type { ComponentType } from 'react';
import { NativeModules } from 'react-native';
import type { EventsMapProps } from './events-map-types';

export type { EventsMapProps, MapPoint } from './events-map-types';

/**
 * True in Nikl's own builds (development, preview, store), false in Expo Go, which can't run
 * Mapbox's native code. Explore then shows the list only.
 */
export const nativeMapAvailable = NativeModules.RNMBXModule != null;

/**
 * The Explore map, or null when the native map isn't in this build.
 * Loaded lazily because importing @rnmapbox/maps without its native code throws at startup.
 */
export const EventsMap: ComponentType<EventsMapProps> | null = nativeMapAvailable
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- must not load in Expo Go
    (require('./events-map-native') as typeof import('./events-map-native')).EventsMapNative
  : null;
