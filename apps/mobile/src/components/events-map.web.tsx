import type { ComponentType } from 'react';
import type { EventsMapProps } from './events-map-types';

export type { EventsMapProps, MapPoint } from './events-map-types';

/** The mobile app's web build shows the list only; the website (apps/web) has its own map. */
export const nativeMapAvailable = false;
export const EventsMap: ComponentType<EventsMapProps> | null = null;
