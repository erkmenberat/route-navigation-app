import { api } from '@/services/api';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type RouteHistoryItem = {
  id: number;
  origin?: string | null;
  destination?: string | null;
  startLat: number;
  startLong: number;
  finishLat: number;
  finishLong: number;
  startAt?: string | null;
  finishAt?: string | null;
  distance: number;
  duration: number;
  createdAt: string;
};

function formatDistance(meters: number) {
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number) {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export default function HistoryScreen() {
  const [routes, setRoutes] = useState<RouteHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadHistory = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setErrorMessage('');

    try {
      const response = await api.get<RouteHistoryItem[]>('/routes/history');
      setRoutes(response.data);
    } catch (error) {
      console.log(error);
      setErrorMessage('Verlauf konnte nicht geladen werden. Bitte pruefe Backend und Login.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory])
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color="#60a5fa" />
        <Text style={styles.loadingText}>Verlauf wird geladen...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verlauf</Text>

      {errorMessage ? (
        <View style={styles.messageCard}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable style={styles.button} onPress={() => loadHistory()}>
            <Text style={styles.buttonText}>Erneut versuchen</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        contentContainerStyle={routes.length ? styles.listContent : styles.emptyContent}
        data={routes}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor="#60a5fa"
            onRefresh={() => loadHistory(true)}
          />
        }
        ListEmptyComponent={
          <View style={styles.messageCard}>
            <Text style={styles.emptyTitle}>Noch keine Routen</Text>
            <Text style={styles.emptyText}>
              Starte und beende eine Navigation, dann erscheint sie hier.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.routeCard}>
            <Text style={styles.routeDate}>{formatDate(item.createdAt)}</Text>
            <Text numberOfLines={2} style={styles.routeDestination}>
              {item.destination ?? 'Unbekanntes Ziel'}
            </Text>
            <Text numberOfLines={1} style={styles.routeOrigin}>
              Von {item.origin ?? 'Aktueller Standort'}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Distanz</Text>
                <Text style={styles.metaValue}>{formatDistance(item.distance)}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Dauer</Text>
                <Text style={styles.metaValue}>{formatDuration(item.duration)}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    alignItems: 'center',
    backgroundColor: '#121212',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#121212',
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 56,
  },
  title: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 18,
  },
  loadingText: {
    color: '#d1d5db',
    fontWeight: '600',
  },
  listContent: {
    gap: 12,
    paddingBottom: 28,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 80,
  },
  messageCard: {
    backgroundColor: '#1e1e1e',
    borderColor: '#333',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  errorText: {
    color: '#fecaca',
    lineHeight: 20,
    marginBottom: 12,
  },
  emptyTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: '#d1d5db',
    lineHeight: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 12,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  routeCard: {
    backgroundColor: '#1e1e1e',
    borderColor: '#333',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  routeDate: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  routeDestination: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  routeOrigin: {
    color: '#d1d5db',
    fontSize: 13,
    marginTop: 6,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  metaItem: {
    backgroundColor: '#111827',
    borderRadius: 6,
    flex: 1,
    padding: 10,
  },
  metaLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  metaValue: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '800',
  },
});
