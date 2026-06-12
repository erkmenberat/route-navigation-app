import { Camera, MapView } from '@rnmapbox/maps';
import { Platform, StyleSheet } from 'react-native';

export default function HomeScreen() {
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
});
