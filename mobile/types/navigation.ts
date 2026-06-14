export type Coordinate = [number, number];
export type NavigationMode = 'simulation' | 'live';
export type MapPerspective = 'overview' | 'navigation';

export type RouteSummary = {
  distanceKm: number;
  distanceMeters: number;
  durationMin: number;
  durationSeconds: number;
};

export type GeocodingFeature = {
  id: string;
  place_name: string;
  center: Coordinate;
};

type GeocodingV6Feature = {
  id: string;
  geometry: { coordinates: [number, number] };
  properties: { full_address?: string; name?: string };
};

export type GeocodingResponse = {
  features?: GeocodingV6Feature[];
};

export type DirectionsResponse = {
  routes?: {
    distance?: number;
    duration?: number;
    geometry?: {
      coordinates?: Coordinate[];
      type?: 'LineString';
    };
  }[];
};
