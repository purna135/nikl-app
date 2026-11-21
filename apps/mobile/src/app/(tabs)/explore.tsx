import { EmptyState, Screen, T } from '@/components/ui';

/** Explore opens on the map by default (decided 21 Nov 2026). The map lands in week 3. */
export default function ExploreScreen() {
  return (
    <Screen>
      <T variant="title">Explore</T>
      <EmptyState
        emoji="🗺️"
        title="The map goes here"
        body="Explore opens on a map of Bhubaneswar with every event as a pin, plus a grid view and filters."
      />
    </Screen>
  );
}
