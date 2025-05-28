// File: src/hooks/useGoogleMaps.ts
import { useEffect, useState } from 'react';

interface UseGoogleMapsProps {
  apiKey: string;
  onLoad?: () => void;
}

export function useGoogleMaps({ apiKey, onLoad }: UseGoogleMapsProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      onLoad?.();
      return;
    }

    // Check if script is already loading
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      return;
    }

    // Validate API key
    if (!apiKey || apiKey === 'bogus key' || apiKey.includes('YOUR_API_KEY')) {
      setError('Invalid or missing Google Maps API key. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env.local file.');
      return;
    }

    const script = document.createElement('script');
    // Simplified script URL - removed marker library since we're using regular markers
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=3`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // Add a small delay to ensure Google Maps is fully loaded
      setTimeout(() => {
        if (window.google && window.google.maps) {
          console.log('Google Maps loaded successfully'); // Debug log
          setIsLoaded(true);
          onLoad?.();
        } else {
          setError('Google Maps failed to initialize properly');
        }
      }, 100);
    };

    script.onerror = () => {
      setError('Failed to load Google Maps API. Please check your API key and network connection.');
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript && existingScript.parentNode) {
        existingScript.parentNode.removeChild(existingScript);
      }
    };
  }, [apiKey, onLoad]);

  return { isLoaded, error };
}