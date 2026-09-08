/// <reference types="google.maps" />
// Loader for the Google Maps JavaScript API (browser key, referrer restricted).

declare global {
  interface Window {
    __initGoogleMaps?: () => void;
    google?: typeof google;
  }
}

let loadPromise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (loadPromise) return loadPromise;

  const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as
    | string
    | undefined;
  const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as
    | string
    | undefined;

  if (!key) {
    return Promise.reject(new Error("Falta la clave de Google Maps"));
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    window.__initGoogleMaps = () => resolve();
    const script = document.createElement("script");
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${key}` +
      `&loading=async&callback=__initGoogleMaps&language=es` +
      (channel ? `&channel=${channel}` : "");
    script.async = true;
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("No se pudo cargar Google Maps"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function useGoogleMapsReady() {
  return loadGoogleMaps();
}
