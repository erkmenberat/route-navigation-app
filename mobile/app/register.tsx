import { api } from '@/services/api';
import { getAuthErrorMessage } from '@/services/auth-error';
import { deleteAuthToken } from '@/services/auth-token';
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

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'error' | 'success' | 'info'>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function register() {
    setIsSubmitting(true);
    setStatusType('info');
    setStatusMessage('Sending register request to backend...');

    try {
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
      });

      await deleteAuthToken();
      setStatusType('success');
      setStatusMessage('Registration successful. Please log in.');

      router.replace('/login');
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setStatusType('error');
      setStatusMessage(message);
      Alert.alert('Register issue', message);
      console.log(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registrieren</Text>

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

      <Pressable style={styles.button} onPress={register}>
        <Text style={styles.buttonText}>{isSubmitting ? 'Bitte warten...' : 'Registrieren'}</Text>
      </Pressable>

      {statusMessage ? (
        <Text style={[styles.status, styles[statusType]]}>{statusMessage}</Text>
      ) : null}

      <Pressable style={styles.driverButton} onPress={() => router.navigate('/driver-register')}>
        <Text style={styles.driverButtonText}>Ich bin Fahrer →</Text>
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
    backgroundColor: '#2563eb',
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
