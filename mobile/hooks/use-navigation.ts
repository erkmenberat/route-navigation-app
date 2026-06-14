import { api } from '@/services/api';
import type {
  Coordinate,
  GeocodingFeature,
  MapPerspective,
  NavigationMode,
  RouteSummary,
} from '@/types/navigation';
import { calculateBearing } from '@/utils/geo';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject, RefObject } from 'react';

interface UseNavigationProps {
  routeCoordinates: Coordinate[];
  routeSummary: RouteSummary | null;
  selectedDestination: GeocodingFeature | null;
  currentCoordinate: Coordinate | null;
  showTemporaryLocationStatus: (message: string) => void;
  mapPerspectiveRef: RefObject<MapPerspective>;
  onCameraUpdate: (coord: Coordinate) => void;
}

export function useNavigation({
  routeCoordinates,
  routeSummary,
  selectedDestination,
  currentCoordinate,
  showTemporaryLocationStatus,
  mapPerspectiveRef,
  onCameraUpdate,
}: UseNavigationProps) {
  const driverCoordinateRef = useRef<Coordinate | null>(null);
  const isNavigatingRef = useRef(false);
  const navigationStartedAtRef = useRef<string | null>(null);
  const savedRouteKeyRef = useRef<string | null>(null);
  const simulationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref keeps the latest callback version available inside the setInterval closure
  const onCameraUpdateRef = useRef(onCameraUpdate);
  const saveRouteHistoryRef = useRef<() => Promise<void>>(async () => {});

  const [isNavigating, setIsNavigating] = useState(false);
  const [driverCoordinate, setDriverCoordinate] = useState<Coordinate | null>(null);
  const [driverBearing, setDriverBearing] = useState(0);
  const [navigationMode, setNavigationMode] = useState<NavigationMode>('simulation');

  useEffect(() => {
    onCameraUpdateRef.current = onCameraUpdate;
  });

  const updateDriverCoordinate = useCallback(
    (coordinate: Coordinate, previousCoordinate?: Coordinate | null) => {
      const origin = previousCoordinate ?? driverCoordinateRef.current;
      if (origin) {
        setDriverBearing(calculateBearing(origin, coordinate));
      }
      driverCoordinateRef.current = coordinate;
      setDriverCoordinate(coordinate);
    },
    [],
  );

  const setInitialDriverPosition = useCallback(
    (coord: Coordinate) => {
      if (!driverCoordinateRef.current) {
        updateDriverCoordinate(coord);
      }
    },
    [updateDriverCoordinate],
  );

  const clearSimulationInterval = useCallback(() => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
  }, []);

  const saveRouteHistory = useCallback(async () => {
    const firstCoordinate = routeCoordinates[0];
    const lastCoordinate = routeCoordinates[routeCoordinates.length - 1];

    if (!firstCoordinate || !lastCoordinate || !selectedDestination || !routeSummary) return;

    const routeKey = `${selectedDestination.id}-${routeSummary.distanceMeters}-${routeSummary.durationSeconds}`;
    if (savedRouteKeyRef.current === routeKey) return;

    try {
      await api.post('/routes/history', {
        origin: 'Aktueller Standort',
        destination: selectedDestination.place_name,
        startLat: firstCoordinate[1],
        startLong: firstCoordinate[0],
        finishLat: lastCoordinate[1],
        finishLong: lastCoordinate[0],
        startAt: navigationStartedAtRef.current ?? new Date().toISOString(),
        finishAt: new Date().toISOString(),
        distance: routeSummary.distanceMeters,
        duration: routeSummary.durationSeconds,
      });
      savedRouteKeyRef.current = routeKey;
      showTemporaryLocationStatus('Route im Verlauf gespeichert.');
    } catch (error) {
      console.error(error);
      showTemporaryLocationStatus('Route konnte nicht gespeichert werden.');
    }
  }, [routeCoordinates, routeSummary, selectedDestination, showTemporaryLocationStatus]);

  // Keep saveRouteHistory ref current so the interval closure always calls the latest version
  useEffect(() => {
    saveRouteHistoryRef.current = saveRouteHistory;
  }, [saveRouteHistory]);

  const stopNavigation = useCallback(
    (options?: { saveHistory?: boolean }) => {
      clearSimulationInterval();
      isNavigatingRef.current = false;
      setIsNavigating(false);
      if (options?.saveHistory) {
        void saveRouteHistory();
      }
    },
    [clearSimulationInterval, saveRouteHistory],
  );

  const startNavigation = useCallback(() => {
    if (!routeCoordinates.length) {
      showTemporaryLocationStatus('Berechne zuerst eine Route.');
      return;
    }

    clearSimulationInterval();
    navigationStartedAtRef.current = new Date().toISOString();
    isNavigatingRef.current = true;
    setIsNavigating(true);

    if (navigationMode === 'live') {
      if (!currentCoordinate) {
        isNavigatingRef.current = false;
        setIsNavigating(false);
        showTemporaryLocationStatus('Live-Standort ist noch nicht verfuegbar.');
        return;
      }
      updateDriverCoordinate(currentCoordinate);
      onCameraUpdateRef.current(currentCoordinate);
      showTemporaryLocationStatus('Live-EchtNavig aktiv');
      return;
    }

    let routeIndex = 0;
    updateDriverCoordinate(routeCoordinates[routeIndex]);
    onCameraUpdateRef.current(routeCoordinates[routeIndex]);
    showTemporaryLocationStatus('Simulation aktiv');

    simulationIntervalRef.current = setInterval(() => {
      routeIndex += 1;

      if (routeIndex >= routeCoordinates.length) {
        clearInterval(simulationIntervalRef.current!);
        simulationIntervalRef.current = null;
        isNavigatingRef.current = false;
        setIsNavigating(false);
        void saveRouteHistoryRef.current();
        showTemporaryLocationStatus('Simulation beendet');
        return;
      }

      const nextCoordinate = routeCoordinates[routeIndex];
      updateDriverCoordinate(nextCoordinate, routeCoordinates[routeIndex - 1]);

      if (mapPerspectiveRef.current === 'navigation' || routeIndex % 8 === 0) {
        onCameraUpdateRef.current(nextCoordinate);
      }
    }, 650);
  }, [
    routeCoordinates,
    navigationMode,
    currentCoordinate,
    clearSimulationInterval,
    showTemporaryLocationStatus,
    updateDriverCoordinate,
    mapPerspectiveRef,
  ]);

  const changeNavigationMode = useCallback(
    (mode: NavigationMode) => {
      clearSimulationInterval();
      setNavigationMode(mode);

      if (isNavigatingRef.current) {
        isNavigatingRef.current = false;
        setIsNavigating(false);
        showTemporaryLocationStatus('Navigation gestoppt. Modus gewechselt.');
      }

      const nextDriverCoordinate = mode === 'live' ? currentCoordinate : routeCoordinates[0];
      if (nextDriverCoordinate) {
        updateDriverCoordinate(nextDriverCoordinate);
      }
    },
    [
      clearSimulationInterval,
      currentCoordinate,
      routeCoordinates,
      showTemporaryLocationStatus,
      updateDriverCoordinate,
    ],
  );

  // Update driver position in live mode on each GPS update
  useEffect(() => {
    if (!isNavigating || navigationMode !== 'live' || !currentCoordinate) return;
    updateDriverCoordinate(currentCoordinate);
  }, [currentCoordinate, isNavigating, navigationMode, updateDriverCoordinate]);

  // Reset all navigation state when the destination changes
  useEffect(() => {
    clearSimulationInterval();
    isNavigatingRef.current = false;
    setIsNavigating(false);
    setDriverCoordinate(null);
    driverCoordinateRef.current = null;
    setDriverBearing(0);
    savedRouteKeyRef.current = null;
  }, [clearSimulationInterval, selectedDestination?.id]);

  useEffect(() => {
    return () => {
      clearSimulationInterval();
    };
  }, [clearSimulationInterval]);

  return {
    isNavigating,
    driverCoordinate,
    driverBearing,
    driverCoordinateRef: driverCoordinateRef as MutableRefObject<Coordinate | null>,
    navigationMode,
    startNavigation,
    stopNavigation,
    changeNavigationMode,
    updateDriverCoordinate,
    setInitialDriverPosition,
  };
}
