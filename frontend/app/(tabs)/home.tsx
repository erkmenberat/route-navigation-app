import Mapbox, { Camera, CircleLayer, MapView, ShapeSource } from '@rnmapbox/maps';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
const fallbackCoordinate: [number, number] = [-43.2268, -22.9358];

type Coordinate = [number, number];

type GeocodingFeature = {
  id: string;
  place_name: string;
  center: Coordinate;
};

type GeocodingResponse = {
  features?: GeocodingFeature[];
};

if (mapboxToken) {
  Mapbox.setAccessToken(mapboxToken);
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const currentCoordinateRef = useRef<Coordinate | null>(null);
  const locationStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentCoordinate, setCurrentCoordinate] = useState<Coordinate | null>(null);
  const [cameraCenter, setCameraCenter] = useState<Coordinate>(fallbackCoordinate);
  const [cameraUpdateId, setCameraUpdateId] = useState(0);
  const [locationStatus, setLocationStatus] = useState('Standort wird vorbereitet...');
  const [isLocationStatusVisible, setIsLocationStatusVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingFeature[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<GeocodingFeature | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

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

  function updateCurrentCoordinate(coordinate: Coordinate) {
    const isFirstLocation = !currentCoordinateRef.current;

    currentCoordinateRef.current = coordinate;
    setCurrentCoordinate(coordinate);

    if (isFirstLocation) {
      setCameraCenter(coordinate);
      setCameraUpdateId((value) => value + 1);
    }
  }

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
      ]);
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
          ]);
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
  }, [showTemporaryLocationStatus]);

  useEffect(() => {
    return () => {
      if (locationStatusTimeoutRef.current) {
        clearTimeout(locationStatusTimeoutRef.current);
      }
    };
  }, []);

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

  function selectDestination(destination: GeocodingFeature) {
    setSelectedDestination(destination);
    setCameraCenter(destination.center);
    setCameraUpdateId((value) => value + 1);
    setSearchQuery(destination.place_name);
    setSearchResults([]);
    setSearchError('');
  }

  function centerCurrentLocation() {
    if (!currentCoordinate) {
      showTemporaryLocationStatus('Aktueller Standort ist noch nicht verfuegbar.');
      return;
    }

    setCameraCenter([currentCoordinate[0], currentCoordinate[1]]);
    setCameraUpdateId((value) => value + 1);
  }

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
          key={cameraUpdateId}
          animationDuration={800}
          animationMode="flyTo"
          centerCoordinate={cameraCenter}
          heading={-161.81}
          pitch={70}
          zoomLevel={currentCoordinate || selectedDestination ? 15 : 12.1}
        />

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
          }}
        />

        {isSearching ? (
          <View style={styles.searchState}>
            <ActivityIndicator color="#f9fafb" />
            <Text style={styles.searchStateText}>Suche laeuft...</Text>
          </View>
        ) : null}

        {searchError ? <Text style={styles.searchError}>{searchError}</Text> : null}

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

      {isLocationStatusVisible ? (
        <View style={[styles.locationStatus, { top: insets.top + 76 }]}>
          <Text style={styles.locationStatusText}>{locationStatus}</Text>
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
