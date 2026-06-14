import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { GeocodingFeature } from '@/types/navigation';

interface SearchPanelProps {
  searchQuery: string;
  searchResults: GeocodingFeature[];
  isSearching: boolean;
  searchError: string;
  hasNoResults: boolean;
  isRouteLoading: boolean;
  routeError: string;
  topInset: number;
  onChangeText: (text: string) => void;
  onSelectDestination: (destination: GeocodingFeature) => void;
}

export function SearchPanel({
  searchQuery,
  searchResults,
  isSearching,
  searchError,
  hasNoResults,
  isRouteLoading,
  routeError,
  topInset,
  onChangeText,
  onSelectDestination,
}: SearchPanelProps) {
  return (
    <View style={[styles.container, { top: topInset + 12 }]}>
      <TextInput
        autoCapitalize="none"
        placeholder="Zieladresse suchen"
        placeholderTextColor="#9ca3af"
        returnKeyType="search"
        style={styles.input}
        value={searchQuery}
        onChangeText={onChangeText}
      />

      {isSearching ? (
        <View style={styles.stateRow}>
          <ActivityIndicator color="#f9fafb" />
          <Text style={styles.stateText}>Suche laeuft...</Text>
        </View>
      ) : null}

      {hasNoResults ? (
        <Text style={styles.stateText}>Keine Ergebnisse gefunden.</Text>
      ) : null}
      {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}
      {isRouteLoading ? <Text style={styles.stateText}>Route wird berechnet...</Text> : null}
      {routeError ? <Text style={styles.errorText}>{routeError}</Text> : null}

      {searchResults.length > 0 ? (
        <ScrollView keyboardShouldPersistTaps="handled" style={styles.resultsList}>
          {searchResults.map((result) => (
            <Pressable
              key={result.id}
              onPress={() => onSelectDestination(result)}
              style={styles.resultItem}
            >
              <Text numberOfLines={2} style={styles.resultText}>
                {result.place_name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(17, 24, 39, 0.92)',
    borderRadius: 8,
    elevation: 6,
    left: 16,
    padding: 8,
    position: 'absolute',
    right: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    zIndex: 2,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    color: '#111827',
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    width: '100%',
  },
  stateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 10,
  },
  stateText: {
    color: '#f9fafb',
    fontSize: 14,
  },
  errorText: {
    color: '#fecaca',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 4,
    paddingTop: 10,
  },
  resultsList: {
    marginTop: 8,
    maxHeight: 220,
  },
  resultItem: {
    borderTopColor: 'rgba(249, 250, 251, 0.18)',
    borderTopWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  resultText: {
    color: '#f9fafb',
    fontSize: 14,
    lineHeight: 19,
  },
});
