import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NavigationMode, RouteSummary } from '@/types/navigation';

interface RouteInfoCardProps {
  routeSummary: RouteSummary;
  navigationMode: NavigationMode;
  isNavigating: boolean;
  bottomInset: number;
  estimatedPrice?: number;
  showRideRequestAction?: boolean;
  isRideRequestDisabled?: boolean;
  rideStatusMessage?: string | null;
  rideErrorMessage?: string | null;
  cancelRideLabel?: string | null;
  isCancelRideDisabled?: boolean;
  onChangeNavigationMode: (mode: NavigationMode) => void;
  onStartNavigation?: () => void;
  onStopNavigation?: () => void;
  onRequestRide?: () => void;
  onCancelRide?: () => void;
  onCloseRoute?: () => void;
}

export function RouteInfoCard({
  routeSummary,
  navigationMode,
  isNavigating,
  bottomInset,
  estimatedPrice,
  showRideRequestAction = false,
  isRideRequestDisabled = false,
  rideStatusMessage,
  rideErrorMessage,
  cancelRideLabel,
  isCancelRideDisabled = false,
  onChangeNavigationMode,
  onStartNavigation,
  onStopNavigation,
  onRequestRide,
  onCancelRide,
  onCloseRoute,
}: RouteInfoCardProps) {
  return (
    <View style={[styles.container, { bottom: bottomInset + 24 }]}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Route</Text>
        {onCloseRoute ? (
          <Pressable
            accessibilityLabel="Route schliessen"
            hitSlop={8}
            onPress={onCloseRoute}
            style={styles.closeButton}
          >
            <Ionicons name="close" color="#f9fafb" size={18} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryValue}>{routeSummary.distanceKm.toFixed(1)} km</Text>
        <Text style={styles.summarySeparator}>|</Text>
        <Text style={styles.summaryValue}>{Math.round(routeSummary.durationMin)} min</Text>
        {estimatedPrice != null ? (
          <>
            <Text style={styles.summarySeparator}>|</Text>
            <Text style={[styles.summaryValue, styles.summaryPrice]}>
              €{estimatedPrice.toFixed(2)}
            </Text>
          </>
        ) : null}
      </View>

      <View style={styles.modeRow}>
        <Pressable
          accessibilityLabel="Simulation auswaehlen"
          onPress={() => onChangeNavigationMode('simulation')}
          style={[styles.modeButton, navigationMode === 'simulation' ? styles.modeButtonActive : null]}
        >
          <Ionicons
            name="play-forward"
            color={navigationMode === 'simulation' ? '#111827' : '#f9fafb'}
            size={16}
          />
          <Text style={[styles.modeButtonText, navigationMode === 'simulation' ? styles.modeButtonTextActive : null]}>
            Simulation
          </Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Live-EchtNavigation auswaehlen"
          onPress={() => onChangeNavigationMode('live')}
          style={[styles.modeButton, navigationMode === 'live' ? styles.modeButtonActive : null]}
        >
          <Ionicons
            name="navigate-circle"
            color={navigationMode === 'live' ? '#111827' : '#f9fafb'}
            size={16}
          />
          <Text style={[styles.modeButtonText, navigationMode === 'live' ? styles.modeButtonTextActive : null]}>
            Live-EchtNavig
          </Text>
        </Pressable>
      </View>

      {onStartNavigation && onStopNavigation ? (
        <Pressable
          accessibilityLabel={isNavigating ? 'Navigation stoppen' : 'Navigation starten'}
          onPress={isNavigating ? onStopNavigation : onStartNavigation}
          style={styles.navButton}
        >
          <Ionicons name={isNavigating ? 'stop' : 'car'} color="#111827" size={18} />
          <Text style={styles.navButtonText}>
            {isNavigating ? 'Navigation stoppen' : 'Navigation starten'}
          </Text>
        </Pressable>
      ) : null}

      {showRideRequestAction ? (
        <Pressable
          accessibilityLabel="Fahrt anfragen"
          disabled={isRideRequestDisabled}
          onPress={onRequestRide}
          style={[styles.rideButton, isRideRequestDisabled ? styles.rideButtonDisabled : null]}
        >
          <Ionicons name="flag" color="#111827" size={18} />
          <Text style={styles.rideButtonText}>Fahrt anfragen</Text>
        </Pressable>
      ) : null}

      {rideStatusMessage ? (
        <View style={styles.rideStatusCard}>
          <Ionicons name="time" color="#bfdbfe" size={16} />
          <Text style={styles.rideStatusText}>{rideStatusMessage}</Text>
        </View>
      ) : null}

      {cancelRideLabel ? (
        <Pressable
          accessibilityLabel={cancelRideLabel}
          disabled={isCancelRideDisabled}
          onPress={onCancelRide}
          style={[styles.cancelRideButton, isCancelRideDisabled ? styles.cancelRideButtonDisabled : null]}
        >
          <Ionicons name="close-circle" color="#fee2e2" size={18} />
          <Text style={styles.cancelRideButtonText}>{cancelRideLabel}</Text>
        </Pressable>
      ) : null}

      {rideErrorMessage ? (
        <View style={styles.rideErrorCard}>
          <Ionicons name="alert-circle" color="#fecaca" size={16} />
          <Text style={styles.rideErrorText}>{rideErrorMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(17, 24, 39, 0.92)',
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
    zIndex: 2,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  summaryValue: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '700',
  },
  summaryPrice: {
    color: '#4ade80',
  },
  summarySeparator: {
    color: '#6b7280',
    fontSize: 18,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  modeButton: {
    alignItems: 'center',
    borderColor: 'rgba(249, 250, 251, 0.28)',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 8,
  },
  modeButtonActive: {
    backgroundColor: '#f9fafb',
    borderColor: '#f9fafb',
  },
  modeButtonText: {
    color: '#f9fafb',
    fontSize: 12,
    fontWeight: '700',
  },
  modeButtonTextActive: {
    color: '#111827',
  },
  navButton: {
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
  navButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  rideButton: {
    alignItems: 'center',
    backgroundColor: '#38bdf8',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  rideButtonDisabled: {
    opacity: 0.55,
  },
  rideButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  rideStatusCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.22)',
    borderColor: 'rgba(191, 219, 254, 0.32)',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rideStatusText: {
    color: '#dbeafe',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
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
  cancelRideButtonText: {
    color: '#fee2e2',
    fontSize: 13,
    fontWeight: '800',
  },
  cancelRideButtonDisabled: {
    opacity: 0.55,
  },
  rideErrorCard: {
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
  rideErrorText: {
    color: '#fee2e2',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
});
