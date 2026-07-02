import { getAuthToken } from '@/services/auth-token';
import { socketService } from '@/services/socket';
import { router } from 'expo-router';
import { useEffect } from 'react';

export default function IndexScreen() {
  useEffect(() => {
    async function redirectByAuthState() {
      const token = await getAuthToken();
      if (token) {
        socketService.connect(token);
        router.replace('/home');
        return;
      }
      router.replace('/login');
    }

    redirectByAuthState();
  }, []);

  return null;
}
