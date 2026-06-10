import { MapView, Camera } from '@rnmapbox/maps';
import { StyleSheet, Platform } from 'react-native';

const App = () => {
  return (
    <MapView
      styleURL={"mapbox://styles/mapbox/standard"}
      style={styles.map}
      projection='globe'
      scaleBarEnabled={false}
      logoPosition={Platform.OS === 'android' ? { bottom: 40, left: 10 } : undefined}
      attributionPosition={Platform.OS === 'android' ? { bottom: 40, right: 10 } : undefined}
    >
      <Camera
        defaultSettings={{
          centerCoordinate: [-43.2268, -22.9358],
          zoomLevel: 12.1,
          pitch: 70,
          heading: -161.81,
        }}
      />
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: '100%',
  },
});

export default App;