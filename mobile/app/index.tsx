import { getAuthToken } from '@/services/auth-token';
import { router } from 'expo-router';
import { useEffect } from 'react';

export default function IndexScreen() {
  useEffect(() => {
    async function redirectByAuthState() {
      const token = await getAuthToken();
      router.replace(token ? '/home' : '/login');
    }

    redirectByAuthState();
  }, []);

  return null;
}
