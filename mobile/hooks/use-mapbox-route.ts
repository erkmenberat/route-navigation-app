import { useCallback, useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';
import type {
  Coordinate,
  DirectionsResponse,
  GeocodingFeature,
  GeocodingResponse,
  RouteSummary,
} from '@/types/navigation';

const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

export function useMapboxRoute(currentCoordinateRef: MutableRefObject<Coordinate | null>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingFeature[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<GeocodingFeature | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');

  // Debounced geocoding search
  useEffect(() => {
    const trimmedQuery = searchQuery.trim();

    if (!mapboxToken || trimmedQuery.length < 3) {
      setSearchResults([]);
      setSearchError('');
      setIsSearching(false);
      setLastSearchedQuery('');
      return;
    }

    if (selectedDestination?.place_name === trimmedQuery) {
      setSearchResults([]);
      setSearchError('');
      setIsSearching(false);
      setLastSearchedQuery('');
      return;
    }

    const abortController = new AbortController();
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      setSearchError('');

      let timedOut = false;
      const requestTimeoutId = setTimeout(() => {
        timedOut = true;
        abortController.abort();
      }, 10000);

      try {
        const params = new URLSearchParams({
          access_token: mapboxToken,
          autocomplete: 'true',
          language: 'de',
          limit: '5',
          q: trimmedQuery,
        });
        const proximity = currentCoordinateRef.current;
        if (proximity) {
          params.set('proximity', `${proximity[0]},${proximity[1]}`);
        }

        const response = await fetch(
          `https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`,
          { signal: abortController.signal },
        );

        if (!response.ok) {
          throw new Error(`Mapbox geocoding failed with status ${response.status}`);
        }

        const data = (await response.json()) as GeocodingResponse;
        const features = (data.features ?? []).map((f) => ({
          id: f.id,
          place_name: f.properties.full_address ?? f.properties.name ?? '',
          center: f.geometry.coordinates,
        }));
        setSearchResults(features);
        setLastSearchedQuery(trimmedQuery);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          if (timedOut) {
            setSearchError('Zeitüberschreitung. Bitte erneut versuchen.');
            setLastSearchedQuery(trimmedQuery);
          }
          return;
        }
        console.error(error);
        setSearchResults([]);
        setLastSearchedQuery(trimmedQuery);
        setSearchError('Zielsuche konnte nicht geladen werden.');
      } finally {
        clearTimeout(requestTimeoutId);
        setIsSearching(false);
      }
    }, 400);

    return () => {
      abortController.abort();
      clearTimeout(timeout);
    };
  }, [searchQuery, selectedDestination?.place_name, currentCoordinateRef]);

  // Route calculation — only re-runs when destination changes, not on GPS updates
  useEffect(() => {
    if (!mapboxToken || !selectedDestination || !currentCoordinateRef.current) {
      setRouteCoordinates([]);
      setRouteSummary(null);
      setIsRouteLoading(false);
      setRouteError('');
      return;
    }

    const abortController = new AbortController();
    const accessToken = mapboxToken;
    const originCoordinate = currentCoordinateRef.current;
    const destinationCoordinate = selectedDestination.center;

    async function fetchRoute() {
      setIsRouteLoading(true);
      setRouteError('');

      try {
        const [originLon, originLat] = originCoordinate;
        const [destinationLon, destinationLat] = destinationCoordinate;
        const params = new URLSearchParams({
          access_token: accessToken,
          geometries: 'geojson',
          overview: 'full',
        });

        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${originLon},${originLat};${destinationLon},${destinationLat}?${params.toString()}`,
          { signal: abortController.signal },
        );

        if (!response.ok) {
          throw new Error(`Mapbox directions failed with status ${response.status}`);
        }

        const data = (await response.json()) as DirectionsResponse;
        const route = data.routes?.[0];
        const coordinates = route?.geometry?.coordinates;

        if (!route || !coordinates?.length) {
          throw new Error('Mapbox directions returned no route geometry');
        }

        setRouteCoordinates(coordinates);
        setRouteSummary({
          distanceKm: (route.distance ?? 0) / 1000,
          distanceMeters: route.distance ?? 0,
          durationMin: (route.duration ?? 0) / 60,
          durationSeconds: Math.round(route.duration ?? 0),
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error(error);
        setRouteCoordinates([]);
        setRouteSummary(null);
        setRouteError('Route konnte nicht berechnet werden.');
      } finally {
        setIsRouteLoading(false);
      }
    }

    fetchRoute();

    return () => {
      abortController.abort();
    };
  }, [selectedDestination, currentCoordinateRef]);

  const selectDestination = useCallback((destination: GeocodingFeature) => {
    setSelectedDestination(destination);
    setSearchQuery(destination.place_name);
    setSearchResults([]);
    setSearchError('');
    setLastSearchedQuery('');
    setRouteError('');
    setRouteSummary(null);
  }, []);

  const hasNoResults =
    !isSearching &&
    lastSearchedQuery.length >= 3 &&
    lastSearchedQuery === searchQuery.trim() &&
    searchResults.length === 0 &&
    !searchError;

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    selectedDestination,
    setSelectedDestination,
    isSearching,
    searchError,
    hasNoResults,
    routeCoordinates,
    routeSummary,
    isRouteLoading,
    routeError,
    setRouteError,
    selectDestination,
  };
}
