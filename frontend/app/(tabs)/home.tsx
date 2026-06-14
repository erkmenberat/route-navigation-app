import Mapbox, {
  Camera,
  CircleLayer,
  LineLayer,
  MapView,
  PointAnnotation,
  ShapeSource,
  UserTrackingMode,
} from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
const fallbackCoordinate: [number, number] = [-43.2268, -22.9358];

type Coordinate = [number, number];
type NavigationMode = 'simulation' | 'live';
type MapPerspective = 'overview' | 'navigation';

type GeocodingFeature = {
  id: string;
  place_name: string;
  center: Coordinate;
};

type GeocodingResponse = {
  features?: GeocodingFeature[];
};

type DirectionsResponse = {
  routes?: {
    distance?: number;
    duration?: number;
    geometry?: {
      coordinates?: Coordinate[];
      type?: 'LineString';
    };
  }[];
};

if (mapboxToken) {
  Mapbox.setAccessToken(mapboxToken);
}

function calculateBearing(start: Coordinate, end: Coordinate) {
  const [startLon, startLat] = start.map((value) => (value * Math.PI) / 180);
  const [endLon, endLat] = end.map((value) => (value * Math.PI) / 180);
  const deltaLon = endLon - startLon;
  const y = Math.sin(deltaLon) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(deltaLon);

  return (Math.atan2(y, x) * 180) / Math.PI;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const currentCoordinateRef = useRef<Coordinate | null>(null);
  const currentHeadingRef = useRef(0);
  const driverCoordinateRef = useRef<Coordinate | null>(null);
  const locationStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simulationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isNavigatingRef = useRef(false);
  const navigationModeRef = useRef<NavigationMode>('simulation');
  const mapPerspectiveRef = useRef<MapPerspective>('overview');
  const [currentCoordinate, setCurrentCoordinate] = useState<Coordinate | null>(null);
  const [currentHeading, setCurrentHeading] = useState(0);
  const [cameraCenter, setCameraCenter] = useState<Coordinate>(fallbackCoordinate);
  const [cameraUpdateId, setCameraUpdateId] = useState(0);
  const [locationStatus, setLocationStatus] = useState('Standort wird vorbereitet...');
  const [isLocationStatusVisible, setIsLocationStatusVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingFeature[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<GeocodingFeature | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [routeSummary, setRouteSummary] = useState<{
    distanceKm: number;
    durationMin: number;
  } | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [navigationMode, setNavigationMode] = useState<NavigationMode>('simulation');
  const [isNavigating, setIsNavigating] = useState(false);
  const [driverCoordinate, setDriverCoordinate] = useState<Coordinate | null>(null);
  const [driverBearing, setDriverBearing] = useState(0);
  const [mapPerspective, setMapPerspective] = useState<MapPerspective>('overview');
  const navigationCameraPadding = {
    paddingBottom: 56,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: Math.max(180, Math.round(windowHeight * 0.34)),
  };

  const clearSimulationInterval = useCallback(() => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
  }, []);

  const stopNavigation = useCallback(() => {
    clearSimulationInterval();
    isNavigatingRef.current = false;
    setIsNavigating(false);
  }, [clearSimulationInterval]);

  const updateDriverCoordinate = useCallback((coordinate: Coordinate, previousCoordinate?: Coordinate | null) => {
    const origin = previousCoordinate ?? driverCoordinateRef.current;

    if (origin) {
      setDriverBearing(calculateBearing(origin, coordinate));
    }

    driverCoordinateRef.current = coordinate;
    setDriverCoordinate(coordinate);
  }, []);

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

  const updateCurrentCoordinate = useCallback((coordinate: Coordinate, heading?: number | null) => {
    const isFirstLocation = !currentCoordinateRef.current;
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

    if (isNavigatingRef.current && navigationModeRef.current === 'live') {
      updateDriverCoordinate(coordinate, previousCoordinate);
    }

    if (isFirstLocation) {
      setCameraCenter(coordinate);
      setCameraUpdateId((value) => value + 1);
    }
  }, [updateDriverCoordinate]);

  useEffect(() => {
    isNavigatingRef.current = isNavigating;
  }, [isNavigating]);

  useEffect(() => {
    navigationModeRef.current = navigationMode;

    if (navigationMode === 'live') {
      clearSimulationInterval();
    }
  }, [clearSimulationInterval, navigationMode]);

  useEffect(() => {
    mapPerspectiveRef.current = mapPerspective;
  }, [mapPerspective]);

  useEffect(() => {
    if (!mapboxToken) {
      return;
    }

    let locationSubscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    async function startLocationUpdates() {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!isMounted) {
        return;
      }

      if (permission.status !== Location.PermissionStatus.GRANTED) {
        showTemporaryLocationStatus('Standortberechtigung wurde nicht erteilt.');
        return;
      }

      const initialPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (!isMounted) {
        return;
      }

      updateCurrentCoordinate([
        initialPosition.coords.longitude,
        initialPosition.coords.latitude,
      ], initialPosition.coords.heading);
      showTemporaryLocationStatus('Live-Standort aktiv');

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
          timeInterval: 2000,
        },
        (position) => {
          updateCurrentCoordinate([
            position.coords.longitude,
            position.coords.latitude,
          ], position.coords.heading);
        }
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
    };
  }, [showTemporaryLocationStatus, updateCurrentCoordinate]);

  useEffect(() => {
    return () => {
      if (locationStatusTimeoutRef.current) {
        clearTimeout(locationStatusTimeoutRef.current);
      }

      clearSimulationInterval();
    };
  }, [clearSimulationInterval]);

  useEffect(() => {
    stopNavigation();
    setDriverCoordinate(null);
    driverCoordinateRef.current = null;
    setDriverBearing(0);
  }, [selectedDestination?.id, stopNavigation]);

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();

    if (!mapboxToken || trimmedQuery.length < 3) {
      setSearchResults([]);
      setSearchError('');
      setIsSearching(false);
      return;
    }

    if (selectedDestination?.place_name === trimmedQuery) {
      setSearchResults([]);
      setSearchError('');
      setIsSearching(false);
      return;
    }

    const abortController = new AbortController();
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      setSearchError('');

      try {
        const params = new URLSearchParams({
          access_token: mapboxToken,
          autocomplete: 'true',
          language: 'de',
          limit: '5',
        });
        const proximity = currentCoordinateRef.current;

        if (proximity) {
          params.set('proximity', `${proximity[0]},${proximity[1]}`);
        }

        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            trimmedQuery
          )}.json?${params.toString()}`,
          { signal: abortController.signal }
        );

        if (!response.ok) {
          throw new Error(`Mapbox geocoding failed with status ${response.status}`);
        }

        const data = (await response.json()) as GeocodingResponse;
        setSearchResults(data.features ?? []);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        console.error(error);
        setSearchResults([]);
        setSearchError('Zielsuche konnte nicht geladen werden.');
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      abortController.abort();
      clearTimeout(timeout);
    };
  }, [searchQuery, selectedDestination?.place_name]);

  useEffect(() => {
    if (!mapboxToken || !selectedDestination || !currentCoordinate) {
      setRouteCoordinates([]);
      setRouteSummary(null);
      setIsRouteLoading(false);
      setRouteError('');
      return;
    }

    const abortController = new AbortController();
    const accessToken = mapboxToken;
    const originCoordinate = currentCoordinate;
    const destinationCoordinate = selectedDestination.center;

    async function fetchRoute() {
      setIsRouteLoading(true);
      setRouteError('');

      try {
        const [originLon, originLat] = originCoordinate;
        const [destinationLon, destinationLat] = destinationCoordinate;
        const params = new URLSearchParams({
          access_token: accessToken,
          geometries: 'geojson',
          overview: 'full',
        });

        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${originLon},${originLat};${destinationLon},${destinationLat}?${params.toString()}`,
          { signal: abortController.signal }
        );

        if (!response.ok) {
          throw new Error(`Mapbox directions failed with status ${response.status}`);
        }

        const data = (await response.json()) as DirectionsResponse;
        const route = data.routes?.[0];
        const coordinates = route?.geometry?.coordinates;

        if (!route || !coordinates?.length) {
          throw new Error('Mapbox directions returned no route geometry');
        }

        setRouteCoordinates(coordinates);
        if (!driverCoordinateRef.current) {
          updateDriverCoordinate(coordinates[0]);
        }
        setRouteSummary({
          distanceKm: (route.distance ?? 0) / 1000,
          durationMin: (route.duration ?? 0) / 60,
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        console.error(error);
        setRouteCoordinates([]);
        setRouteSummary(null);
        setRouteError('Route konnte nicht berechnet werden.');
      } finally {
        setIsRouteLoading(false);
      }
    }

    fetchRoute();

    return () => {
      abortController.abort();
    };
  }, [currentCoordinate, selectedDestination, updateDriverCoordinate]);

  function selectDestination(destination: GeocodingFeature) {
    setSelectedDestination(destination);
    setCameraCenter(destination.center);
    setCameraUpdateId((value) => value + 1);
    setSearchQuery(destination.place_name);
    setSearchResults([]);
    setSearchError('');
    setRouteError('');
    setRouteSummary(null);
  }

  function centerCurrentLocation() {
    if (!currentCoordinate) {
      showTemporaryLocationStatus('Aktueller Standort ist noch nicht verfuegbar.');
      return;
    }

    setCameraCenter([currentCoordinate[0], currentCoordinate[1]]);
    setCameraUpdateId((value) => value + 1);
  }

  function toggleMapPerspective() {
    const nextPerspective = mapPerspective === 'overview' ? 'navigation' : 'overview';
    const nextCenter = driverCoordinate ?? currentCoordinate ?? cameraCenter;

    mapPerspectiveRef.current = nextPerspective;
    setMapPerspective(nextPerspective);
    setCameraCenter(nextCenter);
    setCameraUpdateId((value) => value + 1);
  }

  function changeNavigationMode(mode: NavigationMode) {
    setNavigationMode(mode);

    if (isNavigating) {
      stopNavigation();
      showTemporaryLocationStatus('Navigation gestoppt. Modus gewechselt.');
    }

    const nextDriverCoordinate = mode === 'live' ? currentCoordinate : routeCoordinates[0];

    if (nextDriverCoordinate) {
      updateDriverCoordinate(nextDriverCoordinate);
    }
  }

  function startNavigation() {
    if (!routeCoordinates.length) {
      showTemporaryLocationStatus('Berechne zuerst eine Route.');
      return;
    }

    clearSimulationInterval();
    isNavigatingRef.current = true;
    setIsNavigating(true);

    if (navigationMode === 'live') {
      const liveCoordinate = currentCoordinate;

      if (!liveCoordinate) {
        stopNavigation();
        showTemporaryLocationStatus('Live-Standort ist noch nicht verfuegbar.');
        return;
      }

      updateDriverCoordinate(liveCoordinate);
      setCameraCenter(liveCoordinate);
      setCameraUpdateId((value) => value + 1);
      showTemporaryLocationStatus('Live-EchtNavig aktiv');
      return;
    }

    let routeIndex = 0;
    updateDriverCoordinate(routeCoordinates[routeIndex]);
    setCameraCenter(routeCoordinates[routeIndex]);
    setCameraUpdateId((value) => value + 1);
    showTemporaryLocationStatus('Simulation aktiv');

    simulationIntervalRef.current = setInterval(() => {
      routeIndex += 1;

      if (routeIndex >= routeCoordinates.length) {
        stopNavigation();
        showTemporaryLocationStatus('Simulation beendet');
        return;
      }

      const nextCoordinate = routeCoordinates[routeIndex];
      updateDriverCoordinate(nextCoordinate, routeCoordinates[routeIndex - 1]);

      if (mapPerspectiveRef.current === 'navigation') {
        setCameraCenter(nextCoordinate);
        setCameraUpdateId((value) => value + 1);
      }

      if (routeIndex % 8 === 0) {
        setCameraCenter(nextCoordinate);
        setCameraUpdateId((value) => value + 1);
      }
    }, 650);
  }

  const navigationCameraTarget = driverCoordinate ?? currentCoordinate ?? cameraCenter;
  const navigationCameraHeading = navigationMode === 'simulation' && isNavigating
    ? driverBearing
    : currentHeading;

  if (!mapboxToken) {
    return (
      <View style={styles.missingTokenContainer}>
        <Text style={styles.missingTokenTitle}>Mapbox token missing</Text>
        <Text style={styles.missingTokenText}>
          Set EXPO_PUBLIC_MAPBOX_TOKEN in the root .env file and restart Expo.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        attributionPosition={Platform.OS === 'android' ? { bottom: 40, right: 10 } : undefined}
        logoPosition={Platform.OS === 'android' ? { bottom: 40, left: 10 } : undefined}
        projection="globe"
        scaleBarEnabled={false}
        style={styles.map}
        styleURL="mapbox://styles/mapbox/standard"
      >
        <Camera
          animationDuration={900}
          animationMode="easeTo"
          centerCoordinate={mapPerspective === 'overview' ? cameraCenter : navigationCameraTarget}
          followHeading={navigationCameraHeading}
          followPadding={navigationCameraPadding}
          followPitch={55}
          followUserLocation={
            mapPerspective === 'navigation' && navigationMode === 'live' && !!currentCoordinate
          }
          followUserMode={UserTrackingMode.FollowWithCourse}
          followZoomLevel={17}
          heading={mapPerspective === 'overview' ? 0 : navigationCameraHeading}
          pitch={mapPerspective === 'overview' ? 0 : 55}
          triggerKey={`${mapPerspective}-${cameraUpdateId}`}
          zoomLevel={mapPerspective === 'overview'
            ? currentCoordinate || selectedDestination
              ? 14.5
              : 12.1
            : 17}
        />

        {routeCoordinates.length > 0 ? (
          <ShapeSource
            id="route-source"
            shape={{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: routeCoordinates,
              },
              properties: {},
            }}
          >
            <LineLayer
              id="route-line"
              style={{
                lineCap: 'round',
                lineColor: '#22c55e',
                lineJoin: 'round',
                lineOpacity: 0.9,
                lineWidth: 5,
              }}
            />
          </ShapeSource>
        ) : null}

        {currentCoordinate ? (
          <ShapeSource
            id="current-location-source"
            shape={{
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: currentCoordinate,
              },
              properties: {},
            }}
          >
            <CircleLayer
              id="current-location-circle"
              style={{
                circleColor: '#2563eb',
                circleRadius: 8,
                circleStrokeColor: '#ffffff',
                circleStrokeWidth: 3,
              }}
            />
          </ShapeSource>
        ) : null}

        {selectedDestination ? (
          <ShapeSource
            id="destination-source"
            shape={{
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: selectedDestination.center,
              },
              properties: {},
            }}
          >
            <CircleLayer
              id="destination-circle"
              style={{
                circleColor: '#ef4444',
                circleRadius: 9,
                circleStrokeColor: '#ffffff',
                circleStrokeWidth: 3,
              }}
            />
          </ShapeSource>
        ) : null}

        {driverCoordinate ? (
          <PointAnnotation id="driver-marker" coordinate={driverCoordinate}>
            <View
              style={[
                styles.driverMarker,
                { transform: [{ rotate: `${driverBearing}deg` }] },
              ]}
            >
              <Ionicons name="navigate" color="#111827" size={22} />
            </View>
          </PointAnnotation>
        ) : null}
      </MapView>

      <View style={[styles.searchPanel, { top: insets.top + 12 }]}>
        <TextInput
          autoCapitalize="none"
          placeholder="Zieladresse suchen"
          placeholderTextColor="#9ca3af"
          returnKeyType="search"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            setSelectedDestination(null);
            setRouteCoordinates([]);
            setRouteSummary(null);
            setRouteError('');
            stopNavigation();
            setDriverCoordinate(null);
            driverCoordinateRef.current = null;
          }}
        />

        {isSearching ? (
          <View style={styles.searchState}>
            <ActivityIndicator color="#f9fafb" />
            <Text style={styles.searchStateText}>Suche laeuft...</Text>
          </View>
        ) : null}

        {searchError ? <Text style={styles.searchError}>{searchError}</Text> : null}
        {isRouteLoading ? <Text style={styles.searchStateText}>Route wird berechnet...</Text> : null}
        {routeError ? <Text style={styles.searchError}>{routeError}</Text> : null}

        {searchResults.length > 0 ? (
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.resultsList}>
            {searchResults.map((result) => (
              <Pressable
                key={result.id}
                onPress={() => selectDestination(result)}
                style={styles.resultItem}
              >
                <Text numberOfLines={2} style={styles.resultText}>
                  {result.place_name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <Pressable
        accessibilityLabel="Aktuellen Standort zentrieren"
        hitSlop={8}
        onPress={centerCurrentLocation}
        style={[
          styles.recenterButton,
          { bottom: insets.bottom + 88 },
          !currentCoordinate ? styles.recenterButtonDisabled : null,
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
        onPress={toggleMapPerspective}
        style={[styles.perspectiveButton, { bottom: insets.bottom + 152 }]}
      >
        <Ionicons
          name={mapPerspective === 'overview' ? 'navigate' : 'map'}
          color="#111827"
          size={24}
        />
      </Pressable>

      {isLocationStatusVisible ? (
        <View style={[styles.locationStatus, { top: insets.top + 76 }]}>
          <Text style={styles.locationStatusText}>{locationStatus}</Text>
        </View>
      ) : null}

      {routeSummary ? (
        <View style={[styles.routeInfoCard, { bottom: insets.bottom + 24 }]}>
          <Text style={styles.routeInfoLabel}>Route</Text>
          <View style={styles.routeInfoRow}>
            <Text style={styles.routeInfoValue}>{routeSummary.distanceKm.toFixed(1)} km</Text>
            <Text style={styles.routeInfoSeparator}>|</Text>
            <Text style={styles.routeInfoValue}>{Math.round(routeSummary.durationMin)} min</Text>
          </View>
          <View style={styles.navigationModeRow}>
            <Pressable
              accessibilityLabel="Simulation auswaehlen"
              onPress={() => changeNavigationMode('simulation')}
              style={[
                styles.modeButton,
                navigationMode === 'simulation' ? styles.modeButtonActive : null,
              ]}
            >
              <Ionicons
                name="play-forward"
                color={navigationMode === 'simulation' ? '#111827' : '#f9fafb'}
                size={16}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  navigationMode === 'simulation' ? styles.modeButtonTextActive : null,
                ]}
              >
                Simulation
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Live-EchtNavigation auswaehlen"
              onPress={() => changeNavigationMode('live')}
              style={[
                styles.modeButton,
                navigationMode === 'live' ? styles.modeButtonActive : null,
              ]}
            >
              <Ionicons
                name="navigate-circle"
                color={navigationMode === 'live' ? '#111827' : '#f9fafb'}
                size={16}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  navigationMode === 'live' ? styles.modeButtonTextActive : null,
                ]}
              >
                Live-EchtNavig
              </Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityLabel={isNavigating ? 'Navigation stoppen' : 'Navigation starten'}
            onPress={isNavigating ? stopNavigation : startNavigation}
            style={styles.navigationButton}
          >
            <Ionicons name={isNavigating ? 'stop' : 'car'} color="#111827" size={18} />
            <Text style={styles.navigationButtonText}>
              {isNavigating ? 'Navigation stoppen' : 'Navigation starten'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  map: {
    flex: 1,
    width: '100%',
  },
  searchPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(17, 24, 39, 0.92)',
    borderRadius: 8,
    elevation: 6,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    zIndex: 2,
  },
  searchInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    color: '#111827',
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    width: '100%',
  },
  searchState: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 10,
  },
  searchStateText: {
    color: '#f9fafb',
    fontSize: 14,
  },
  searchError: {
    color: '#fecaca',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 4,
    paddingTop: 10,
  },
  resultsList: {
    marginTop: 8,
    maxHeight: 220,
  },
  resultItem: {
    borderTopColor: 'rgba(249, 250, 251, 0.18)',
    borderTopWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  resultText: {
    color: '#f9fafb',
    fontSize: 14,
    lineHeight: 19,
  },
  recenterButton: {
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
  recenterButtonDisabled: {
    opacity: 0.55,
  },
  perspectiveButton: {
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
  driverMarker: {
    alignItems: 'center',
    backgroundColor: '#facc15',
    borderColor: '#111827',
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  locationStatus: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(17, 24, 39, 0.88)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    zIndex: 2,
  },
  locationStatusText: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  routeInfoCard: {
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
  routeInfoLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  routeInfoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  routeInfoValue: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '700',
  },
  routeInfoSeparator: {
    color: '#6b7280',
    fontSize: 18,
  },
  navigationModeRow: {
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
  navigationButton: {
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
  navigationButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  missingTokenContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    padding: 20,
  },
  missingTokenTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  missingTokenText: {
    color: '#d1d5db',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
});
