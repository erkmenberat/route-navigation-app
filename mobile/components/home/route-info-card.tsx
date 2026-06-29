import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NavigationMode, RouteSummary } from '@/types/navigation';

interface RouteInfoCardProps {
  routeSummary: RouteSummary;
  navigationMode: NavigationMode;
  isNavigating: boolean;
  bottomInset: number;
  estimatedPrice?: number;
  onChangeNavigationMode: (mode: NavigationMode) => void;
  onStartNavigation: () => void;
  onStopNavigation: () => void;
}

export function RouteInfoCard({
  routeSummary,
  navigationMode,
  isNavigating,
  bottomInset,
  estimatedPrice,
  onChangeNavigationMode,
  onStartNavigation,
  onStopNavigation,
}: RouteInfoCardProps) {
  return (
    <View style={[styles.container, { bottom: bottomInset + 24 }]}>
      <Text style={styles.label}>Route</Text>
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
  label: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
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
});
