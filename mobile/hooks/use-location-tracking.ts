import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Coordinate } from '@/types/navigation';
import { calculateBearing } from '@/utils/geo';

export function useLocationTracking() {
  const currentCoordinateRef = useRef<Coordinate | null>(null);
  const currentHeadingRef = useRef(0);
  const locationStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [currentCoordinate, setCurrentCoordinate] = useState<Coordinate | null>(null);
  const [currentHeading, setCurrentHeading] = useState(0);
  const [locationStatus, setLocationStatus] = useState('Standort wird vorbereitet...');
  const [isLocationStatusVisible, setIsLocationStatusVisible] = useState(true);

  const showTemporaryLocationStatus = useCallback((message: string) => {
    if (locationStatusTimeoutRef.current) {
      clearTimeout(locationStatusTimeoutRef.current);
    }
    setLocationStatus(message);
    setIsLocationStatusVisible(true);
    locationStatusTimeoutRef.current = setTimeout(() => {
      setIsLocationStatusVisible(false);
    }, 3000);
  }, []);

  const updateCurrentCoordinate = useCallback(
    (coordinate: Coordinate, heading?: number | null) => {
      const previousCoordinate = currentCoordinateRef.current;
      const hasGpsHeading = typeof heading === 'number' && heading >= 0;
      const nextHeading = hasGpsHeading
        ? heading
        : previousCoordinate
          ? calculateBearing(previousCoordinate, coordinate)
          : currentHeadingRef.current;

      currentCoordinateRef.current = coordinate;
      currentHeadingRef.current = nextHeading;
      setCurrentCoordinate(coordinate);
      setCurrentHeading(nextHeading);
    },
    [],
  );

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    async function startLocationUpdates() {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!isMounted) return;

      if (permission.status !== Location.PermissionStatus.GRANTED) {
        showTemporaryLocationStatus('Standortberechtigung wurde nicht erteilt.');
        return;
      }

      const initialPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      if (!isMounted) return;

      updateCurrentCoordinate(
        [initialPosition.coords.longitude, initialPosition.coords.latitude],
        initialPosition.coords.heading,
      );
      showTemporaryLocationStatus('Live-Standort aktiv');

      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 2000 },
        (position) => {
          updateCurrentCoordinate(
            [position.coords.longitude, position.coords.latitude],
            position.coords.heading,
          );
        },
      );
    }

    startLocationUpdates().catch((error) => {
      console.error(error);
      if (isMounted) {
        showTemporaryLocationStatus('Standort konnte nicht geladen werden.');
      }
    });

    return () => {
      isMounted = false;
      locationSubscription?.remove();
      if (locationStatusTimeoutRef.current) {
        clearTimeout(locationStatusTimeoutRef.current);
      }
    };
  }, [showTemporaryLocationStatus, updateCurrentCoordinate]);

  return {
    currentCoordinate,
    currentCoordinateRef,
    currentHeading,
    locationStatus,
    isLocationStatusVisible,
    showTemporaryLocationStatus,
  };
}
