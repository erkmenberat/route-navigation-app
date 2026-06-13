import Mapbox, { Camera, CircleLayer, MapView, ShapeSource } from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
const fallbackCoordinate: [number, number] = [-43.2268, -22.9358];

if (mapboxToken) {
  Mapbox.setAccessToken(mapboxToken);
}

export default function HomeScreen() {
  const [currentCoordinate, setCurrentCoordinate] = useState<[number, number] | null>(null);
  const [locationStatus, setLocationStatus] = useState('Standort wird vorbereitet...');

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
        setLocationStatus('Standortberechtigung wurde nicht erteilt.');
        return;
      }

      const initialPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (!isMounted) {
        return;
      }

      setCurrentCoordinate([
        initialPosition.coords.longitude,
        initialPosition.coords.latitude,
      ]);
      setLocationStatus('Live-Standort aktiv');

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
          timeInterval: 2000,
        },
        (position) => {
          setCurrentCoordinate([
            position.coords.longitude,
            position.coords.latitude,
          ]);
        }
      );
    }

    startLocationUpdates().catch((error) => {
      console.error(error);

      if (isMounted) {
        setLocationStatus('Standort konnte nicht geladen werden.');
      }
    });

    return () => {
      isMounted = false;
      locationSubscription?.remove();
    };
  }, []);

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
          animationDuration={800}
          animationMode="flyTo"
          centerCoordinate={currentCoordinate ?? fallbackCoordinate}
          heading={-161.81}
          pitch={70}
          zoomLevel={currentCoordinate ? 15 : 12.1}
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
      </MapView>

      <View style={styles.locationStatus}>
        <Text style={styles.locationStatusText}>{locationStatus}</Text>
      </View>
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
  locationStatus: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(17, 24, 39, 0.88)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
