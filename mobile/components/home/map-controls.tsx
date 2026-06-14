import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import type { Coordinate, MapPerspective } from '@/types/navigation';

interface MapControlsProps {
  currentCoordinate: Coordinate | null;
  mapPerspective: MapPerspective;
  bottomInset: number;
  onRecenter: () => void;
  onTogglePerspective: () => void;
}

export function MapControls({
  currentCoordinate,
  mapPerspective,
  bottomInset,
  onRecenter,
  onTogglePerspective,
}: MapControlsProps) {
  return (
    <>
      <Pressable
        accessibilityLabel="Aktuellen Standort zentrieren"
        hitSlop={8}
        onPress={onRecenter}
        style={[
          styles.button,
          { bottom: bottomInset + 88 },
          !currentCoordinate ? styles.buttonDisabled : null,
        ]}
      >
        <Ionicons name="locate" color="#111827" size={24} />
      </Pressable>

      <Pressable
        accessibilityLabel={
          mapPerspective === 'overview'
            ? 'Zur Navigationsperspektive wechseln'
            : 'Zur Uebersichtsperspektive wechseln'
        }
        hitSlop={8}
        onPress={onTogglePerspective}
        style={[styles.button, { bottom: bottomInset + 152 }]}
      >
        <Ionicons
          name={mapPerspective === 'overview' ? 'navigate' : 'map'}
          color="#111827"
          size={24}
        />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 28,
    elevation: 6,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    width: 56,
    zIndex: 2,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
