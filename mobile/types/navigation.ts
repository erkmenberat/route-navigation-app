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

export type GeocodingResponse = {
  features?: GeocodingFeature[];
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
