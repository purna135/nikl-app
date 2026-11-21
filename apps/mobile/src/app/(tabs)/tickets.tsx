import { EmptyState, Screen, T } from '@/components/ui';

/** Ticket wallet. Booking and offline QR tickets arrive in weeks 6–7. */
export default function TicketsScreen() {
  return (
    <Screen>
      <T variant="title">Tickets</T>
      <EmptyState emoji="🎟️" title="No tickets yet" body="Events you book or RSVP to show up here, with a QR code that works offline." />
    </Screen>
  );
}
