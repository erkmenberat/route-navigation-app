import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { DriverRideOffer, RideRequest } from '@/types/ride';

interface DriverRideModalProps {
  ride: DriverRideOffer;
  isAccepting: boolean;
  isTaken: boolean;
  onAccept: () => void;
}

interface DriverActiveRideCardProps {
  ride: RideRequest;
  bottomInset: number;
  isStarting: boolean;
  isCancelling: boolean;
  errorMessage: string | null;
  onStartRide: () => void;
  onCancelRide: () => void;
}

export function DriverRideModal({ ride, isAccepting, isTaken, onAccept }: DriverRideModalProps) {
  return (
    <Modal animationType="fade" transparent visible>
      <View style={styles.modalBackdrop}>
        <View style={styles.rideModal}>
          <Text style={styles.rideModalLabel}>Neue Fahrt</Text>
          <Text style={styles.rideModalTitle}>{ride.destination}</Text>

          <View style={styles.rideMetaGrid}>
            <RideMetaItem label="Distanz" value={formatRideDistance(ride.distance)} />
            <RideMetaItem label="Dauer" value={formatRideDuration(ride.duration)} />
            <RideMetaItem label="Preis" value={formatRidePrice(ride.price)} />
          </View>

          {isTaken ? (
            <View style={styles.takenNotice}>
              <Ionicons name="alert-circle" color="#fef3c7" size={17} />
              <Text style={styles.takenNoticeText}>Bereits vergeben</Text>
            </View>
          ) : (
            <Pressable
              accessibilityLabel="Fahrt annehmen"
              disabled={isAccepting}
              onPress={onAccept}
              style={[styles.acceptButton, isAccepting ? styles.acceptButtonDisabled : null]}
            >
              <Ionicons name="checkmark-circle" color="#052e16" size={19} />
              <Text style={styles.acceptButtonText}>{isAccepting ? 'Warte...' : 'Annehmen'}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

export function DriverActiveRideCard({
  ride,
  bottomInset,
  isStarting,
  isCancelling,
  errorMessage,
  onStartRide,
  onCancelRide,
}: DriverActiveRideCardProps) {
  const canStart = ride.status === 'ACCEPTED';
  const cancelLabel = ride.status === 'STARTED' ? 'Fahrt fruehzeitig beenden' : 'Fahrt abbrechen';

  return (
    <View style={[styles.activeRideCard, { bottom: bottomInset + 24 }]}>
      <Text style={styles.activeRideLabel}>Aktive Fahrt</Text>
      <Text style={styles.activeRideDestination}>{ride.destination}</Text>
      <Text style={styles.activeRideStatus}>{canStart ? 'Angenommen' : 'Fahrt gestartet'}</Text>

      {canStart ? (
        <Pressable
          accessibilityLabel="Fahrt starten"
          disabled={isStarting}
          onPress={onStartRide}
          style={[styles.startRideButton, isStarting ? styles.startRideButtonDisabled : null]}
        >
          <Ionicons name="play" color="#111827" size={18} />
          <Text style={styles.startRideButtonText}>{isStarting ? 'Starte...' : 'Fahrt starten'}</Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityLabel={cancelLabel}
        disabled={isCancelling}
        onPress={onCancelRide}
        style={[styles.cancelRideButton, isCancelling ? styles.cancelRideButtonDisabled : null]}
      >
        <Ionicons name="close-circle" color="#fee2e2" size={18} />
        <Text style={styles.cancelRideButtonText}>{isCancelling ? 'Beende...' : cancelLabel}</Text>
      </Pressable>

      {errorMessage ? (
        <View style={styles.driverErrorCard}>
          <Ionicons name="alert-circle" color="#fecaca" size={16} />
          <Text style={styles.driverErrorText}>{errorMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

function RideMetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rideMetaItem}>
      <Text style={styles.rideMetaLabel}>{label}</Text>
      <Text style={styles.rideMetaValue}>{value}</Text>
    </View>
  );
}

function formatRideDistance(distanceMeters: number): string {
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function formatRideDuration(durationSeconds: number): string {
  return `${Math.max(1, Math.round(durationSeconds / 60))} min`;
}

function formatRidePrice(price: number): string {
  return `EUR ${price.toFixed(2)}`;
}

const styles = StyleSheet.create({
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  rideModal: {
    backgroundColor: '#111827',
    borderColor: 'rgba(249, 250, 251, 0.16)',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 8,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    width: '100%',
  },
  rideModalLabel: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  rideModalTitle: {
    color: '#f9fafb',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 25,
  },
  rideMetaGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  rideMetaItem: {
    backgroundColor: 'rgba(249, 250, 251, 0.08)',
    borderRadius: 6,
    flex: 1,
    minHeight: 58,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  rideMetaLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  rideMetaValue: {
    color: '#f9fafb',
    fontSize: 15,
    fontWeight: '800',
  },
  acceptButton: {
    alignItems: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  acceptButtonDisabled: {
    opacity: 0.55,
  },
  acceptButtonText: {
    color: '#052e16',
    fontSize: 15,
    fontWeight: '900',
  },
  takenNotice: {
    alignItems: 'center',
    backgroundColor: 'rgba(250, 204, 21, 0.18)',
    borderColor: 'rgba(250, 204, 21, 0.42)',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    minHeight: 42,
    paddingHorizontal: 10,
  },
  takenNoticeText: {
    color: '#fef3c7',
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  activeRideCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.94)',
    borderRadius: 8,
    elevation: 6,
    left: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'absolute',
    right: 88,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    zIndex: 3,
  },
  activeRideLabel: {
    color: '#86efac',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  activeRideDestination: {
    color: '#f9fafb',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  activeRideStatus: {
    color: '#d1d5db',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  startRideButton: {
    alignItems: 'center',
    backgroundColor: '#facc15',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  startRideButtonDisabled: {
    opacity: 0.55,
  },
  startRideButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  cancelRideButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.24)',
    borderColor: 'rgba(254, 202, 202, 0.38)',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 40,
    paddingHorizontal: 10,
  },
  cancelRideButtonDisabled: {
    opacity: 0.55,
  },
  cancelRideButtonText: {
    color: '#fee2e2',
    fontSize: 13,
    fontWeight: '800',
  },
  driverErrorCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.18)',
    borderColor: 'rgba(254, 202, 202, 0.34)',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  driverErrorText: {
    color: '#fee2e2',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
});
