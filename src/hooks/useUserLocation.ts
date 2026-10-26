import { useState, useEffect, useCallback } from 'react';

const LAST_COORDS_KEY = 'relief_desk_last_coords';
const DEFAULT_COORDS = { lng: 78.9629, lat: 20.5937 }; // Default fallback coordinates

export interface UserLocationState {
  coords: { lng: number; lat: number };
  accuracy: number | null;
  isLoading: boolean;
  error: string | null;
  setCoords: (coords: { lng: number; lat: number }) => void;
  recenter: () => void;
}

export function useUserLocation(): UserLocationState {
  const [coords, setCoordsState] = useState<{ lng: number; lat: number }>(() => {
    try {
      const saved = localStorage.getItem(LAST_COORDS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_COORDS;
  });

  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const setCoords = useCallback((newCoords: { lng: number; lat: number }) => {
    setCoordsState(newCoords);
    try {
      localStorage.setItem(LAST_COORDS_KEY, JSON.stringify(newCoords));
    } catch {
      // ignore
    }
  }, []);

  const requestPosition = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setError('Geolocation not supported by this browser');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords = {
          lng: pos.coords.longitude,
          lat: pos.coords.latitude,
        };
        setCoords(newCoords);
        setAccuracy(pos.coords.accuracy);
        setIsLoading(false);
      },
      (err) => {
        console.warn('Geolocation lookup notice:', err.message);
        setError('Location access denied or unavailable. Using manual position.');
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }, [setCoords]);

  useEffect(() => {
    requestPosition();
  }, [requestPosition]);

  return {
    coords,
    accuracy,
    isLoading,
    error,
    setCoords,
    recenter: requestPosition,
  };
}
