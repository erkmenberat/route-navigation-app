import { api } from '@/services/api';
import { getAuthErrorMessage } from '@/services/auth-error';
import { saveAuthToken } from '@/services/auth-token';
import { useState } from 'react';
import {
  Alert,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'error' | 'success' | 'info'>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function login() {
    setIsSubmitting(true);
    setStatusType('info');
    setStatusMessage('Sending login request to backend...');

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      await saveAuthToken(response.data.access_token);
      setStatusType('success');
      setStatusMessage('Login successful. Backend and database are reachable.');

      router.replace('/home');
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setStatusType('error');
      setStatusMessage(message);
      Alert.alert('Login issue', message);
      console.log(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

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

      <Pressable style={styles.button} onPress={login}>
        <Text style={styles.buttonText}>{isSubmitting ? 'Bitte warten...' : 'Einloggen'}</Text>
      </Pressable>

      {statusMessage ? (
        <Text style={[styles.status, styles[statusType]]}>{statusMessage}</Text>
      ) : null}

      <Pressable style={styles.button} onPress={() => router.navigate('/register')}>
        <Text style={styles.buttonText}>Register</Text>
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
});
