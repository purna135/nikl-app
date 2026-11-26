/**
 * Map helpers shared by the web and mobile maps.
 */

/**
 * Numbers events that sit on exactly the same spot (0, 1, 2…), in list order, so the maps can fan
 * later pins out around the first one instead of hiding them underneath it.
 */
export function stackBySpot<T extends { lat: number; lng: number }>(points: T[]): Array<T & { stack: number }> {
  const seen = new Map<string, number>();
  return points.map((p) => {
    const key = `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
    const stack = seen.get(key) ?? 0;
    seen.set(key, stack + 1);
    return { ...p, stack };
  });
}

/** Screen offset in pixels for the nth extra pin at a spot: a 30 px ring, starting straight up. */
export function stackOffsetPx(stack: number, radius = 30): [number, number] {
  if (stack <= 0) return [0, 0];
  const angle = ((stack - 1) * Math.PI) / 3 - Math.PI / 2;
  return [Math.round(radius * Math.cos(angle)), Math.round(radius * Math.sin(angle))];
}
