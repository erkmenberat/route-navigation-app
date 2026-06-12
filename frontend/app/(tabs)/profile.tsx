import { deleteAuthToken } from '@/services/auth-token';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  async function logout() {
    await deleteAuthToken();
    router.replace('/login');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Pressable style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    padding: 14,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
