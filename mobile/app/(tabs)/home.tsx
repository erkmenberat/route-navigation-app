import Mapbox, {
  Camera,
  CircleLayer,
  LineLayer,
  MapView,
  PointAnnotation,
  ShapeSource,
  UserTrackingMode,
} from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Socket } from 'socket.io-client';

import { DriverActiveRideCard, DriverRideModal } from '@/components/home/driver-ride-overlays';
import { MapControls } from '@/components/home/map-controls';
import { RouteInfoCard } from '@/components/home/route-info-card';
import { SearchPanel } from '@/components/home/search-panel';
import { useLocationTracking } from '@/hooks/use-location-tracking';
import { useMapboxRoute } from '@/hooks/use-mapbox-route';
import { useNavigation } from '@/hooks/use-navigation';
import { useRideSocketEvent } from '@/hooks/use-ride-socket-event';
import { useSocketEvent } from '@/hooks/use-socket-event';
import { acceptRide, cancelRide, requestActiveRide, requestRide, startRide } from '@/services/rides';
import { fetchRouteEstimate } from '@/services/routes';
import { getRole } from '@/services/auth-token';
import { socketService } from '@/services/socket';
import type { Coordinate, MapPerspective } from '@/types/navigation';
import type { DriverRideOffer, RideErrorPayload, RideRequest } from '@/types/ride';
import type { TaxiData } from '@/types/taxi';

const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
const fallbackCoordinate: Coordinate = [-43.2268, -22.9358];
const taxiIcon = require('@/assets/images/taxi.png');
type UserRidePhase = 'pending' | 'accepted' | 'started';
type MapPressFeature = Parameters<NonNullable<ComponentProps<typeof MapView>['onPress']>>[0];

if (mapboxToken) {
  Mapbox.setAccessToken(mapboxToken);
}

function userPhaseFromRide(ride: RideRequest): UserRidePhase {
  if (ride.status === 'STARTED') return 'started';
  if (ride.status === 'ACCEPTED') return 'accepted';
  return 'pending';
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  // Camera state stays in the screen — it directly drives the MapView Camera component
  const mapPerspectiveRef = useRef<MapPerspective>('overview');
  const [mapPerspective, setMapPerspective] = useState<MapPerspective>('overview');
  const [cameraCenter, setCameraCenter] = useState<Coordinate>(fallbackCoordinate);
  //es darf nicht fallbackCoordinate sein weil sonst immer der center button einen fake wert zentrieren wird. Für Production muss das geändert werden.
  const [cameraUpdateId, setCameraUpdateId] = useState(0);

  const triggerCameraUpdate = useCallback((center: Coordinate) => {
    setCameraCenter(center);
    setCameraUpdateId((v) => v + 1);
  }, []);

  const {
    currentCoordinate,
    currentCoordinateRef,
    currentHeading,
    locationStatus,
    isLocationStatusVisible,
    showTemporaryLocationStatus,
  } = useLocationTracking();

  const {
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
    selectDestinationFromCoordinate,
    isSelectingDestinationFromCoordinate,
  } = useMapboxRoute(currentCoordinateRef);

  const {
    isNavigating,
    driverCoordinate,
    driverBearing,
    navigationMode,
    startNavigation,
    stopNavigation,
    changeNavigationMode,
    setInitialDriverPosition,
  } = useNavigation({
    routeCoordinates,
    routeSummary,
    selectedDestination,
    currentCoordinate,
    showTemporaryLocationStatus,
    mapPerspectiveRef,
    onCameraUpdate: triggerCameraUpdate,
  });

  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [userRidePhase, setUserRidePhase] = useState<UserRidePhase | null>(null);
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);
  const [incomingDriverRide, setIncomingDriverRide] = useState<DriverRideOffer | null>(null);
  const [takenDriverRideId, setTakenDriverRideId] = useState<number | null>(null);
  const [driverRideErrorMessage, setDriverRideErrorMessage] = useState<string | null>(null);
  const [acceptingRideId, setAcceptingRideId] = useState<number | null>(null);
  const [startingRideId, setStartingRideId] = useState<number | null>(null);
  const [cancellingRideId, setCancellingRideId] = useState<number | null>(null);
  const [rideErrorMessage, setRideErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!routeSummary) {
      setEstimatedPrice(null);
      return;
    }
    fetchRouteEstimate(routeSummary.distanceMeters, routeSummary.durationSeconds)
      .then(setEstimatedPrice)
      .catch(() => setEstimatedPrice(null));
  }, [routeSummary]);

  const [taxis, setTaxis] = useState<Map<number, TaxiData>>(new Map());

  // Ask the server for the current taxi snapshot once we're guaranteed to
  // already be listening for the reply (see initialTaxiData below) — asking
  // from the generic socket connect handler instead let this screen miss
  // the snapshot if the socket connected before this screen ever mounted.
  useEffect(() => {
    let activeSocket: Socket | null = null;

    function requestSnapshot() {
      activeSocket?.emit('joinTaxiMap');
    }

    function register(s: Socket) {
      if (activeSocket === s) return;
      if (activeSocket) activeSocket.off('connect', requestSnapshot);
      activeSocket = s;
      if (s.connected) requestSnapshot();
      s.on('connect', requestSnapshot);
    }

    const unsubscribe = socketService.onSocket(register);
    return () => {
      unsubscribe();
      if (activeSocket) activeSocket.off('connect', requestSnapshot);
    };
  }, []);

  useSocketEvent<TaxiData[]>('initialTaxiData', (data) => {
    setTaxis(new Map(data.map((t) => [t.id, t])));
  });

  useSocketEvent<{ taxiId: number; lat: number; lng: number }>('locationUpdated', ({ taxiId, lat, lng }) => {
    setTaxis((prev) => {
      const existing = prev.get(taxiId);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(taxiId, { ...existing, latitude: lat, longitude: lng });
      return next;
    });
  });

  useSocketEvent<TaxiData>('taxiConnected', (taxi) => {
    setTaxis((prev) => new Map(prev).set(taxi.id, taxi));
  });

  useSocketEvent<{ taxiId: number }>('driverDisconnected', ({ taxiId }) => {
    setTaxis((prev) => {
      if (!prev.has(taxiId)) return prev;
      const next = new Map(prev);
      next.delete(taxiId);
      return next;
    });
  });

  // Driver-Tracking: eigene Rolle einmalig laden, dann bei jeder GPS-Aktualisierung
  // (aus useLocationTracking, das ohnehin für den blauen "Meine Position"-Punkt läuft)
  // die Position an den Server senden — kein zweiter, redundanter GPS-Watcher.
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    getRole().then(setRole);
  }, []);

  useEffect(() => {
    if (role !== 'USER' && role !== 'DRIVER') return;

    let activeSocket: Socket | null = null;

    function requestActiveSnapshot() {
      try {
        requestActiveRide();
      } catch {
        // Socket may not exist yet; onSocket will call again when it is created.
      }
    }

    function register(s: Socket) {
      if (activeSocket === s) return;
      if (activeSocket) activeSocket.off('connect', requestActiveSnapshot);
      activeSocket = s;
      if (s.connected) requestActiveSnapshot();
      s.on('connect', requestActiveSnapshot);
    }

    const unsubscribe = socketService.onSocket(register);
    return () => {
      unsubscribe();
      if (activeSocket) activeSocket.off('connect', requestActiveSnapshot);
    };
  }, [role]);

  useRideSocketEvent('ride:requested', (ride) => {
    if (role !== 'USER') return;
    setActiveRide(ride);
    setUserRidePhase('pending');
    setCancellingRideId(null);
    setRideErrorMessage(null);
  });

  useRideSocketEvent('ride:active', (ride) => {
    if (role === 'USER') {
      if (!ride) {
        setActiveRide(null);
        setUserRidePhase(null);
        setCancellingRideId(null);
        return;
      }

      setActiveRide(ride);
      setUserRidePhase(userPhaseFromRide(ride));
      setCancellingRideId(null);
      setRideErrorMessage(null);
      return;
    }

    if (role === 'DRIVER') {
      setActiveRide(ride);
      setIncomingDriverRide(null);
      setTakenDriverRideId(null);
      setAcceptingRideId(null);
      setStartingRideId(null);
      setCancellingRideId(null);
      if (ride) setDriverRideErrorMessage(null);
    }
  });

  useRideSocketEvent('ride:accepted', (ride) => {
    if (role === 'USER') {
      setActiveRide(ride);
      setUserRidePhase('accepted');
      setCancellingRideId(null);
      setRideErrorMessage(null);
      return;
    }

    if (role === 'DRIVER') {
      setActiveRide(ride);
      setIncomingDriverRide(null);
      setTakenDriverRideId(null);
      setAcceptingRideId(null);
      setCancellingRideId(null);
      setDriverRideErrorMessage(null);
    }
  });

  useRideSocketEvent('ride:started', (ride) => {
    if (role === 'USER') {
      setActiveRide(ride);
      setUserRidePhase('started');
      setCancellingRideId(null);
      setRideErrorMessage(null);
      return;
    }

    if (role === 'DRIVER') {
      setActiveRide(ride);
      setStartingRideId(null);
      setCancellingRideId(null);
      setDriverRideErrorMessage(null);
    }
  });

  useRideSocketEvent('ride:new', (ride) => {
    if (role !== 'DRIVER' || activeRide) return;
    setIncomingDriverRide(ride);
    setTakenDriverRideId(null);
    setDriverRideErrorMessage(null);
  });

  useRideSocketEvent('ride:taken', ({ rideId }) => {
    if (role !== 'DRIVER') return;

    setAcceptingRideId((current) => (current === rideId ? null : current));
    setIncomingDriverRide((current) => {
      if (!current || current.id !== rideId) return current;
      setTakenDriverRideId(rideId);
      return current;
    });
  });

  useRideSocketEvent('ride:error', (error) => {
    if (role === 'USER') {
      setRideErrorMessage(readableRideError(error));
      if (error.event === 'ride:request') {
        setUserRidePhase(null);
        setActiveRide(null);
      }
      if (error.event === 'ride:cancel') {
        setCancellingRideId(null);
      }
      return;
    }

    if (role === 'DRIVER') {
      setDriverRideErrorMessage(readableRideError(error));
      if (error.event === 'ride:accept') {
        setAcceptingRideId(null);
      }
      if (error.event === 'ride:start') {
        setStartingRideId(null);
      }
      if (error.event === 'ride:cancel') {
        setCancellingRideId(null);
      }
    }
  });

  useRideSocketEvent('ride:cancelled', (ride) => {
    if (role === 'USER') {
      if (activeRide?.id !== ride.id && userRidePhase === null) return;
      setActiveRide(null);
      setUserRidePhase(null);
      setCancellingRideId(null);
      setRideErrorMessage(null);
      resetRouteSelection();
      return;
    }

    if (role === 'DRIVER') {
      if (activeRide?.id === ride.id) {
        setActiveRide(null);
        setStartingRideId(null);
        setCancellingRideId(null);
        setDriverRideErrorMessage('Die Fahrt wurde storniert.');
      }
      if (incomingDriverRide?.id === ride.id) {
        setIncomingDriverRide(null);
        setAcceptingRideId(null);
      }
    }
  });

  useEffect(() => {
    if (!takenDriverRideId) return;

    const timeoutId = setTimeout(() => {
      setIncomingDriverRide((current) => (current?.id === takenDriverRideId ? null : current));
      setTakenDriverRideId(null);
    }, 1200);

    return () => clearTimeout(timeoutId);
  }, [takenDriverRideId]);

  useEffect(() => {
    if (role !== 'DRIVER') return;

    // Während einer laufenden Simulation folgen andere Nutzer der simulierten
    // Route (driverCoordinate) live mit. Sobald die Simulation endet oder
    // gestoppt wird, springt die Übertragung sofort zurück auf die echte
    // GPS-Position — die Route war ja nur eine Simulation, kein echter Fahrtweg.
    const isSimulating = isNavigating && navigationMode === 'simulation';
    const position = isSimulating ? driverCoordinate : currentCoordinate;
    if (!position) return;

    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('updateLocation', {
      lat: position[1],
      lng: position[0],
    });
  }, [role, currentCoordinate, driverCoordinate, isNavigating, navigationMode]);

  // On the very first GPS fix, center the map on the user's actual location
  const hasInitialCameraRef = useRef(false);
  useEffect(() => {
    if (currentCoordinate && !hasInitialCameraRef.current) {
      hasInitialCameraRef.current = true;
      triggerCameraUpdate(currentCoordinate);
    }
  }, [currentCoordinate, triggerCameraUpdate]);

  // Set driver starting position when a new route arrives for the first time
  useEffect(() => {
    if (routeCoordinates.length > 0) {
      setInitialDriverPosition(routeCoordinates[0]);
    }
  }, [routeCoordinates, setInitialDriverPosition]);

  function handleSearchQueryChange(text: string) {
    setSearchQuery(text);
    setSelectedDestination(null);
    setRouteError('');
    stopNavigation();
  }

  function handleSelectDestination(destination: Parameters<typeof selectDestination>[0]) {
    selectDestination(destination);
    triggerCameraUpdate(destination.center);
  }

  async function handleMapPress(feature: MapPressFeature) {
    if (role === 'USER' && hasActiveUserRide) return;

    const coordinates = feature.geometry?.coordinates;
    const longitude = coordinates?.[0];
    const latitude = coordinates?.[1];
    if (typeof longitude !== 'number' || typeof latitude !== 'number') return;

    stopNavigation();
    setRideErrorMessage(null);
    const destination = await selectDestinationFromCoordinate([longitude, latitude]);
    if (destination) {
      triggerCameraUpdate(destination.center);
    }
  }

  function resetRouteSelection() {
    setSearchQuery('');
    setSelectedDestination(null);
    setRouteError('');
    setEstimatedPrice(null);
    stopNavigation();
  }

  function handleRequestRide() {
    if (role !== 'USER') return;

    if (!currentCoordinate || !selectedDestination || !routeSummary) {
      setRideErrorMessage('Berechne zuerst eine Route, bevor du eine Fahrt anfragst.');
      return;
    }

    if (userRidePhase === 'pending') return;

    try {
      requestRide({
        origin: 'Aktueller Standort',
        destination: selectedDestination.place_name,
        startLat: currentCoordinate[1],
        startLong: currentCoordinate[0],
        finishLat: selectedDestination.center[1],
        finishLong: selectedDestination.center[0],
        distance: routeSummary.distanceMeters,
        duration: Math.round(routeSummary.durationSeconds),
      });
      setUserRidePhase('pending');
      setActiveRide(null);
      setRideErrorMessage(null);
    } catch {
      setRideErrorMessage('Fahrt konnte nicht angefragt werden. Pruefe die Verbindung und versuche es erneut.');
      setUserRidePhase(null);
    }
  }

  function handleCloseRoute() {
    if (hasActiveUserRide) return;
    resetRouteSelection();
    setRideErrorMessage(null);
    centerCurrentLocation();
  }

  function handleCancelUserRide() {
    if (role !== 'USER' || !activeRide) {
      setRideErrorMessage('Fahrt kann noch nicht zurueckgenommen werden. Bitte kurz warten.');
      return;
    }

    if (activeRide.status === 'STARTED') return;

    try {
      setCancellingRideId(activeRide.id);
      setRideErrorMessage(null);
      cancelRide(activeRide.id);
    } catch {
      setCancellingRideId(null);
      setRideErrorMessage('Fahrt konnte nicht storniert werden. Pruefe die Verbindung.');
    }
  }

  function handleAcceptRide() {
    if (role !== 'DRIVER' || !incomingDriverRide || takenDriverRideId === incomingDriverRide.id) return;

    try {
      setAcceptingRideId(incomingDriverRide.id);
      setDriverRideErrorMessage(null);
      acceptRide(incomingDriverRide.id);
    } catch {
      setAcceptingRideId(null);
      setDriverRideErrorMessage('Fahrt konnte nicht angenommen werden. Pruefe die Verbindung.');
    }
  }

  function handleStartRide() {
    if (role !== 'DRIVER' || !activeRide || activeRide.status !== 'ACCEPTED') return;

    try {
      setStartingRideId(activeRide.id);
      setDriverRideErrorMessage(null);
      startRide(activeRide.id);
    } catch {
      setStartingRideId(null);
      setDriverRideErrorMessage('Fahrt konnte nicht gestartet werden. Pruefe die Verbindung.');
    }
  }

  function handleCancelDriverRide() {
    if (role !== 'DRIVER' || !activeRide) return;

    try {
      setCancellingRideId(activeRide.id);
      setDriverRideErrorMessage(null);
      cancelRide(activeRide.id);
    } catch {
      setCancellingRideId(null);
      setDriverRideErrorMessage('Fahrt konnte nicht beendet werden. Pruefe die Verbindung.');
    }
  }

  function centerCurrentLocation() {
    if (!currentCoordinate) {
      showTemporaryLocationStatus('Aktueller Standort ist noch nicht verfuegbar.');
      return;
    }
    triggerCameraUpdate(currentCoordinate);
  }

  function toggleMapPerspective() {
    const next: MapPerspective = mapPerspective === 'overview' ? 'navigation' : 'overview';
    const center = driverCoordinate ?? currentCoordinate ?? cameraCenter;
    mapPerspectiveRef.current = next;
    setMapPerspective(next);
    triggerCameraUpdate(center);
  }

  const navigationCameraTarget = driverCoordinate ?? currentCoordinate ?? cameraCenter;
  const navigationCameraHeading =
    navigationMode === 'simulation' && isNavigating ? driverBearing : currentHeading;
  const navigationCameraPadding = {
    paddingBottom: 56,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: Math.max(180, Math.round(windowHeight * 0.34)),
  };
  const rideStatusMessage =
    userRidePhase === 'pending'
      ? 'Suche Fahrer...'
      : userRidePhase === 'accepted'
        ? 'Fahrer hat angenommen'
        : userRidePhase === 'started'
          ? 'Fahrt gestartet'
          : null;
  const hasActiveUserRide = userRidePhase !== null || activeRide !== null;
  const showRouteInfoCard = !!routeSummary && !(role === 'DRIVER' && activeRide);
  const userCancelRideLabel =
    role === 'USER' && activeRide?.status === 'PENDING'
      ? 'Anfrage zuruecknehmen'
      : role === 'USER' && activeRide?.status === 'ACCEPTED'
        ? 'Fahrt stornieren'
        : null;

  if (!mapboxToken) {
    return (
      <View style={styles.missingTokenContainer}>
        <Text style={styles.missingTokenTitle}>Mapbox token missing</Text>
        <Text style={styles.missingTokenText}>
          Set EXPO_PUBLIC_MAPBOX_TOKEN in the root .env file and restart Expo.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        attributionPosition={Platform.OS === 'android' ? { bottom: 40, right: 10 } : undefined}
        logoPosition={Platform.OS === 'android' ? { bottom: 40, left: 10 } : undefined}
        projection="globe"
        scaleBarEnabled={false}
        style={styles.map}
        styleURL="mapbox://styles/mapbox/standard"
        onPress={handleMapPress}
      >
        <Camera
          animationDuration={900}
          animationMode="easeTo"
          centerCoordinate={mapPerspective === 'overview' ? cameraCenter : navigationCameraTarget}
          followHeading={navigationCameraHeading}
          followPadding={navigationCameraPadding}
          followPitch={55}
          followUserLocation={
            mapPerspective === 'navigation' && navigationMode === 'live' && !!currentCoordinate
          }
          followUserMode={UserTrackingMode.FollowWithCourse}
          followZoomLevel={17}
          heading={mapPerspective === 'overview' ? 0 : navigationCameraHeading}
          pitch={mapPerspective === 'overview' ? 0 : 55}
          triggerKey={`${mapPerspective}-${cameraUpdateId}`}
          zoomLevel={
            mapPerspective === 'overview'
              ? currentCoordinate || selectedDestination
                ? 14.5
                : 12.1
              : 17
          }
        />

        {routeCoordinates.length > 0 ? (
          <ShapeSource
            id="route-source"
            shape={{ type: 'Feature', geometry: { type: 'LineString', coordinates: routeCoordinates }, properties: {} }}
          >
            <LineLayer
              id="route-line"
              style={{ lineCap: 'round', lineColor: '#22c55e', lineJoin: 'round', lineOpacity: 0.9, lineWidth: 5 }}
            />
          </ShapeSource>
        ) : null}

        {currentCoordinate ? (
          <ShapeSource
            id="current-location-source"
            shape={{ type: 'Feature', geometry: { type: 'Point', coordinates: currentCoordinate }, properties: {} }}
          >
            <CircleLayer
              id="current-location-circle"
              style={{ circleColor: '#2563eb', circleRadius: 8, circleStrokeColor: '#ffffff', circleStrokeWidth: 3 }}
            />
          </ShapeSource>
        ) : null}

        {selectedDestination ? (
          <ShapeSource
            id="destination-source"
            shape={{ type: 'Feature', geometry: { type: 'Point', coordinates: selectedDestination.center }, properties: {} }}
          >
            <CircleLayer
              id="destination-circle"
              style={{ circleColor: '#ef4444', circleRadius: 9, circleStrokeColor: '#ffffff', circleStrokeWidth: 3 }}
            />
          </ShapeSource>
        ) : null}

        {driverCoordinate ? (
          <PointAnnotation id="driver-marker" coordinate={driverCoordinate}>
            {role === 'DRIVER' ? (
              <Image source={taxiIcon} style={styles.taxiMarker} resizeMode="contain" />
            ) : (
              <View style={[styles.driverMarker, { transform: [{ rotate: `${driverBearing}deg` }] }]}>
                <Ionicons name="navigate" color="#111827" size={22} />
              </View>
            )}
          </PointAnnotation>
        ) : null}

        {Array.from(taxis.values())
          .filter((t) => t.latitude !== null && t.longitude !== null)
          .map((taxi) => (
            <PointAnnotation
              key={`taxi-${taxi.id}`}
              id={`taxi-${taxi.id}`}
              coordinate={[taxi.longitude!, taxi.latitude!]}
            >
              <Image source={taxiIcon} style={styles.taxiMarker} resizeMode="contain" />
            </PointAnnotation>
          ))}
      </MapView>

      <SearchPanel
        hasNoResults={hasNoResults}
        isRouteLoading={isRouteLoading}
        isSelectingDestinationFromCoordinate={isSelectingDestinationFromCoordinate}
        isSearching={isSearching}
        routeError={routeError}
        searchError={searchError}
        searchQuery={searchQuery}
        searchResults={searchResults}
        topInset={insets.top}
        onChangeText={handleSearchQueryChange}
        onSelectDestination={handleSelectDestination}
      />

      <MapControls
        bottomInset={insets.bottom}
        currentCoordinate={currentCoordinate}
        mapPerspective={mapPerspective}
        onRecenter={centerCurrentLocation}
        onTogglePerspective={toggleMapPerspective}
      />

      {isLocationStatusVisible ? (
        <View style={[styles.locationStatus, { top: insets.top + 76 }]}>
          <Text style={styles.locationStatusText}>{locationStatus}</Text>
        </View>
      ) : null}

      {showRouteInfoCard ? (
        <RouteInfoCard
          bottomInset={insets.bottom}
          cancelRideLabel={userCancelRideLabel}
          estimatedPrice={estimatedPrice ?? undefined}
          isCancelRideDisabled={activeRide ? cancellingRideId === activeRide.id : true}
          isNavigating={isNavigating}
          isRideRequestDisabled={hasActiveUserRide}
          navigationMode={navigationMode}
          rideErrorMessage={rideErrorMessage}
          rideStatusMessage={rideStatusMessage}
          routeSummary={routeSummary}
          showRideRequestAction={role === 'USER'}
          onChangeNavigationMode={changeNavigationMode}
          onCancelRide={handleCancelUserRide}
          onCloseRoute={!hasActiveUserRide ? handleCloseRoute : undefined}
          onRequestRide={handleRequestRide}
          onStartNavigation={role === 'DRIVER' ? startNavigation : undefined}
          onStopNavigation={role === 'DRIVER' ? () => stopNavigation({ saveHistory: true }) : undefined}
        />
      ) : null}

      {role === 'DRIVER' && activeRide ? (
        <DriverActiveRideCard
          bottomInset={insets.bottom}
          errorMessage={driverRideErrorMessage}
          isCancelling={cancellingRideId === activeRide.id}
          isStarting={startingRideId === activeRide.id}
          ride={activeRide}
          onCancelRide={handleCancelDriverRide}
          onStartRide={handleStartRide}
        />
      ) : null}

      {role === 'DRIVER' && incomingDriverRide ? (
        <DriverRideModal
          isAccepting={acceptingRideId === incomingDriverRide.id}
          isTaken={takenDriverRideId === incomingDriverRide.id}
          ride={incomingDriverRide}
          onAccept={handleAcceptRide}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  map: {
    flex: 1,
    width: '100%',
  },
  driverMarker: {
    alignItems: 'center',
    backgroundColor: '#facc15',
    borderColor: '#111827',
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  taxiMarker: {
    height: 32,
    width: 32,
  },
  locationStatus: {
    backgroundColor: 'rgba(17, 24, 39, 0.88)',
    borderRadius: 8,
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: 'absolute',
    right: 16,
    zIndex: 2,
  },
  locationStatusText: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  missingTokenContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    padding: 20,
  },
  missingTokenTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  missingTokenText: {
    color: '#d1d5db',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
});

function readableRideError(error: RideErrorPayload): string {
  if (error.code === 'FORBIDDEN') return 'Du bist für diese Fahrtaktion nicht berechtigt.';
  if (error.code === 'UNAUTHORIZED') return 'Bitte melde dich erneut an.';
  if (error.code === 'VALIDATION') return 'Die Fahrtanfrage ist unvollstaendig. Berechne die Route erneut.';
  return error.message || 'Die Fahrtaktion konnte nicht ausgefuehrt werden.';
}
