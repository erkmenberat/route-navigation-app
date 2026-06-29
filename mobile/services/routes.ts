import { api } from './api';

export async function fetchRouteEstimate(
  distanceMeters: number,
  durationSeconds: number,
): Promise<number> {
  const { data } = await api.get<{ estimatedPrice: number }>('/routes/estimate', {
    params: { distance: distanceMeters, duration: durationSeconds },
  });
  return data.estimatedPrice;
}
