import { useEffect, useState } from 'react';

interface UseGoogleMapsOptions {
  apiKey: string;
}

interface UseGoogleMapsReturn {
  isLoaded: boolean;
  error: string | null;
}

export const useGoogleMaps = ({ apiKey }: UseGoogleMapsOptions): UseGoogleMapsReturn => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) {
      setError('Google Maps API key is required');
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already loading
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsLoaded(true));
      existingScript.addEventListener('error', () => setError('Failed to load Google Maps'));
      return;
    }

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setIsLoaded(true);
    };

    script.onerror = () => {
      setError('Failed to load Google Maps');
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [apiKey]);

  return { isLoaded, error };
};