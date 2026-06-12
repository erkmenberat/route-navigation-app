import { StyleSheet, Text, View } from 'react-native';

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#121212',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
  },
});
