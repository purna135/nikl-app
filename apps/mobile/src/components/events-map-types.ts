/** One pin. `stack` numbers events at the same spot (0, 1, 2…) so they can be fanned out. */
export type MapPoint = { id: string; lat: number; lng: number; category: string; title: string; stack: number };

export type EventsMapProps = {
  points: MapPoint[];
  /** The pin whose card is open, if any. */
  selectedId: string | null;
  /** A pin was tapped (id), or the empty map was tapped (null). */
  onSelect: (id: string | null) => void;
};
