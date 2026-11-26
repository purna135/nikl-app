import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { Camera, MapView, MarkerView, setAccessToken, type MapState } from '@rnmapbox/maps';
import { BBSR_CENTER, stackOffsetPx } from '@nikl/utils';
import { categoryLook } from '@/lib/explore';
import { space, useNiklTheme } from '@/theme';
import { T } from './ui';
import type { EventsMapProps, MapPoint } from './events-map-types';

const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
const hasToken = Boolean(TOKEN && TOKEN.startsWith('pk.'));
if (hasToken) void setAccessToken(TOKEN!);

const START = { centerCoordinate: [BBSR_CENTER.lng, BBSR_CENTER.lat], zoomLevel: 11.3 };
const PIN = 38;

/**
 * Where to draw a pin: events at the same spot are fanned out by a fixed number of screen pixels,
 * converted to degrees for the current zoom (Mapbox uses 512 px tiles).
 */
function pinCoordinate(p: MapPoint, zoom: number): [number, number] {
  const [dx, dy] = stackOffsetPx(p.stack);
  if (dx === 0 && dy === 0) return [p.lng, p.lat];
  const degPerPx = 360 / (512 * 2 ** zoom);
  return [p.lng + dx * degPerPx, p.lat - dy * degPerPx * Math.cos((p.lat * Math.PI) / 180)];
}

/** Native Mapbox map with one tappable emoji pin per event. Only loaded in builds that include Mapbox. */
export function EventsMapNative({ points, selectedId, onSelect }: EventsMapProps) {
  const t = useNiklTheme();
  const dark = useColorScheme() === 'dark';
  const camera = useRef<ComponentRef<typeof Camera>>(null);
  // The map reports taps a moment late (after ruling out a double tap) and, on iOS, also for taps on a pin.
  const lastPinPress = useRef(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(!hasToken);
  // Rounded so pins only re-place after a real zoom change, not on every frame.
  const [zoom, setZoom] = useState(START.zoomLevel);

  // Frame all pins whenever the set of events changes (filters, search, refresh).
  const pointsKey = points.map((p) => p.id).join(',');
  useEffect(() => {
    if (!ready || points.length === 0) return;
    if (points.length === 1) {
      camera.current?.setCamera({ centerCoordinate: [points[0]!.lng, points[0]!.lat], zoomLevel: 14, animationDuration: 400 });
      return;
    }
    const lngs = points.map((p) => p.lng);
    const lats = points.map((p) => p.lat);
    camera.current?.fitBounds([Math.max(...lngs), Math.max(...lats)], [Math.min(...lngs), Math.min(...lats)], [70, 50, 170, 50], 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-frame only when the set of events changes
  }, [pointsKey, ready]);

  if (failed) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.fallback, { backgroundColor: t.surface2 }]}>
        <T variant="small" style={{ textAlign: 'center' }}>
          The map isn’t available right now. Switch to List to see every event.
        </T>
      </View>
    );
  }

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      styleURL={dark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11'}
      // Mapbox's terms require the logo and attribution to stay visible.
      logoEnabled
      attributionEnabled
      scaleBarEnabled={false}
      compassEnabled={false}
      pitchEnabled={false}
      rotateEnabled={false}
      onDidFinishLoadingMap={() => setReady(true)}
      onMapLoadingError={() => setFailed(true)}
      onMapIdle={(s: MapState) => setZoom(Math.round(s.properties.zoom * 2) / 2)}
      onPress={() => {
        if (Date.now() - lastPinPress.current > 700) onSelect(null);
      }}
      accessibilityLabel="Map of events in Bhubaneswar">
      <Camera ref={camera} defaultSettings={START} />
      {points.map((p) => {
        const selected = p.id === selectedId;
        const look = categoryLook(p.category);
        return (
          <MarkerView key={p.id} coordinate={pinCoordinate(p, zoom)} allowOverlap isSelected={selected}>
            <Pressable
              onPress={() => {
                lastPinPress.current = Date.now();
                onSelect(p.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={p.title}
              accessibilityState={{ selected }}
              hitSlop={4}
              style={[
                styles.pin,
                { backgroundColor: t.surface, borderColor: selected ? t.accent : t.app },
                selected && styles.pinSelected,
              ]}>
              <Text style={styles.emoji}>{look.emoji}</Text>
            </Pressable>
          </MarkerView>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center', padding: space.xl },
  pin: {
    width: PIN,
    height: PIN,
    borderRadius: PIN / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
  },
  pinSelected: { transform: [{ scale: 1.18 }] },
  emoji: { fontSize: 18, lineHeight: 22 },
});
