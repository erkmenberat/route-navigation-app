import type { Coordinate } from '@/types/navigation';

export function calculateBearing(start: Coordinate, end: Coordinate): number {
  const [startLon, startLat] = start.map((v) => (v * Math.PI) / 180);
  const [endLon, endLat] = end.map((v) => (v * Math.PI) / 180);
  const deltaLon = endLon - startLon;
  const y = Math.sin(deltaLon) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(deltaLon);
  return (Math.atan2(y, x) * 180) / Math.PI;
}
