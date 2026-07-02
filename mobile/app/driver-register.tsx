import { api } from '@/services/api';
import { getAuthErrorMessage } from '@/services/auth-error';
import { saveAuthToken, saveRefreshToken, saveRole } from '@/services/auth-token';
import { socketService } from '@/services/socket';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';

export default function DriverRegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [kennzeichen, setKennzeichen] = useState('');
  const [model, setModel] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'error' | 'success' | 'info'>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function registerDriver() {
    setIsSubmitting(true);
    setStatusType('info');
    setStatusMessage('Sending driver registration request to backend...');

    try {
      const response = await api.post('/auth/register/driver', {
        name,
        email,
        password,
        kennzeichen,
        model,
      });

      await saveAuthToken(response.data.access_token);
      await saveRefreshToken(response.data.refresh_token);
      await saveRole('DRIVER');
      socketService.connect(response.data.access_token);

      setStatusType('success');
      setStatusMessage('Registration successful.');

      router.replace('/home');
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setStatusType('error');
      setStatusMessage(message);
      Alert.alert('Registrierung fehlgeschlagen', message);
      console.log(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fahrer Registrierung</Text>

      <TextInput
        style={styles.input}
        placeholder="Benutzername"
        placeholderTextColor="#888"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="E-Mail"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Passwort"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TextInput
        style={styles.input}
        placeholder="Kennzeichen (z.B. B-TX 1234)"
        placeholderTextColor="#888"
        value={kennzeichen}
        onChangeText={setKennzeichen}
        autoCapitalize="characters"
      />

      <TextInput
        style={styles.input}
        placeholder="Fahrzeugmodell (z.B. Toyota Prius)"
        placeholderTextColor="#888"
        value={model}
        onChangeText={setModel}
      />

      <Pressable style={styles.button} onPress={registerDriver} disabled={isSubmitting}>
        <Text style={styles.buttonText}>{isSubmitting ? 'Bitte warten...' : 'Als Fahrer registrieren'}</Text>
      </Pressable>

      <Pressable style={styles.driverButton} onPress={() => router.navigate('/register')}>
        <Text style={styles.driverButtonText}>Ich bin Kunde →</Text>
      </Pressable>

      {statusMessage ? (
        <Text style={[styles.status, styles[statusType]]}>{statusMessage}</Text>
      ) : null}
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
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    color: 'white',
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#16a34a',
    padding: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  status: {
    borderRadius: 8,
    marginTop: 12,
    padding: 12,
    lineHeight: 20,
    fontWeight: '600',
  },
  info: {
    backgroundColor: '#1e293b',
    color: '#bfdbfe',
  },
  success: {
    backgroundColor: '#064e3b',
    color: '#bbf7d0',
  },
  error: {
    backgroundColor: '#450a0a',
    color: '#fecaca',
  },
  driverButton: {
    marginTop: 12,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  driverButtonText: {
    color: '#9ca3af',
    textAlign: 'center',
    fontWeight: '600',
  },
});
