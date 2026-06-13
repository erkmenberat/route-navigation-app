import Mapbox, { Camera, MapView } from '@rnmapbox/maps';
import { Platform, StyleSheet, Text, View } from 'react-native';

const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

if (mapboxToken) {
  Mapbox.setAccessToken(mapboxToken);
}

export default function HomeScreen() {
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
    <MapView
      attributionPosition={Platform.OS === 'android' ? { bottom: 40, right: 10 } : undefined}
      logoPosition={Platform.OS === 'android' ? { bottom: 40, left: 10 } : undefined}
      projection="globe"
      scaleBarEnabled={false}
      style={styles.map}
      styleURL="mapbox://styles/mapbox/standard"
    >
      <Camera
        defaultSettings={{
          centerCoordinate: [-43.2268, -22.9358],
          heading: -161.81,
          pitch: 70,
          zoomLevel: 12.1,
        }}
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: '100%',
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
