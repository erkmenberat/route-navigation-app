import { api } from '@/services/api';
import { deleteAuthToken } from '@/services/auth-token';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

type UserProfile = {
  id: number;
  email: string;
  name: string;
  createdAt?: string;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await api.get<UserProfile>('/users/profile');
      setProfile(response.data);
    } catch (error) {
      console.log(error);
      setProfile(null);
      setErrorMessage('Profil konnte nicht geladen werden. Bitte pruefe Backend und Login.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function logout() {
    await deleteAuthToken();
    router.replace('/login');
  }

  async function confirmLogout() {
    Alert.alert('Logout', 'Moechtest du dich wirklich ausloggen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profil</Text>

      <View style={styles.card}>
        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#60a5fa" />
            <Text style={styles.mutedText}>Profil wird geladen...</Text>
          </View>
        ) : profile ? (
          <>
            <Text style={styles.label}>Benutzername</Text>
            <Text style={styles.value}>{profile.name}</Text>

            <Text style={styles.label}>E-Mail</Text>
            <Text style={styles.value}>{profile.email}</Text>
          </>
        ) : (
          <>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable style={styles.secondaryButton} onPress={loadProfile}>
              <Text style={styles.secondaryButtonText}>Erneut versuchen</Text>
            </Pressable>
          </>
        )}
      </View>

      <Pressable style={styles.button} onPress={confirmLogout}>
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
  card: {
    backgroundColor: '#1e1e1e',
    borderColor: '#333',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  value: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 18,
  },
  mutedText: {
    color: '#d1d5db',
    fontWeight: '600',
  },
  errorText: {
    color: '#fecaca',
    lineHeight: 20,
    marginBottom: 12,
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
  secondaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 12,
  },
  secondaryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
