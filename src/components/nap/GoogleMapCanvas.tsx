/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

import { loadGoogleMaps } from "@/lib/google-maps";
import { cn } from "@/lib/utils";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  color?: string;
};

type Props = {
  markers?: MapMarker[];
  selectedId?: string | null;
  onMarkerClick?: (id: string) => void;
  onPick?: (lat: number, lng: number) => void;
  pin?: { lat: number; lng: number } | null;
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  fitToMarkers?: boolean;
  cluster?: boolean;
};

// Fallback center: Argentina (Dovanet service area) until data or GPS arrives.
const DEFAULT_CENTER = { lat: -34.6037, lng: -58.3816 };

export function GoogleMapCanvas({
  markers = [],
  selectedId = null,
  onMarkerClick,
  onPick,
  pin = null,
  center,
  zoom = 13,
  className,
  fitToMarkers = false,
  cluster = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRefs = useRef<Map<string, google.maps.Marker>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const pinRef = useRef<google.maps.Marker | null>(null);
  const clickRef = useRef(onPick);
  const markerClickRef = useRef(onMarkerClick);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  clickRef.current = onPick;
  markerClickRef.current = onMarkerClick;

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new google.maps.Map(containerRef.current, {
          center: center ?? DEFAULT_CENTER,
          zoom,
          streetViewControl: false,
          mapTypeControl: true,
          mapTypeControlOptions: { position: google.maps.ControlPosition.TOP_RIGHT },
          fullscreenControl: true,
          clickableIcons: false,
        });
        mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng || !clickRef.current) return;
          clickRef.current(e.latLng.lat(), e.latLng.lng());
        });
        setReady(true);
      })
      .catch((e: Error) => setError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync data markers
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    const current = markerRefs.current;
    const ids = new Set(markers.map((m) => m.id));
    for (const [id, marker] of current) {
      if (!ids.has(id)) {
        marker.setMap(null);
        current.delete(id);
      }
    }

    for (const m of markers) {
      let marker = current.get(m.id);
      if (!marker) {
        marker = new google.maps.Marker({
          position: { lat: m.lat, lng: m.lng },
          ...(cluster ? {} : { map }),
          ...(m.title ? { title: m.title } : {}),
        });
        marker.addListener("click", () => markerClickRef.current?.(m.id));
        current.set(m.id, marker);
      } else {
        marker.setPosition({ lat: m.lat, lng: m.lng });
      }
      const active = selectedId === m.id;
      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: active ? 11 : 8,
        fillColor: active ? "#f59e0b" : (m.color ?? "#1d4ed8"),
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      });
      marker.setZIndex(active ? 999 : 1);
    }

    if (cluster) {
      if (!clustererRef.current) {
        clustererRef.current = new MarkerClusterer({ map, markers: [] });
      }
      clustererRef.current.clearMarkers(true);
      clustererRef.current.addMarkers(Array.from(current.values()));
    }

    if (fitToMarkers && markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }));
      map.fitBounds(bounds, 64);
      if (markers.length === 1) map.setZoom(16);
    }
  }, [markers, selectedId, ready, fitToMarkers, cluster]);

  // Sync draggable pin (coordinate picker)
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    if (!pin) {
      pinRef.current?.setMap(null);
      pinRef.current = null;
      return;
    }
    if (!pinRef.current) {
      pinRef.current = new google.maps.Marker({
        position: pin,
        map,
        draggable: true,
        title: "Ubicación de la NAP",
      });
      pinRef.current.addListener("dragend", (e: google.maps.MapMouseEvent) => {
        if (e.latLng) clickRef.current?.(e.latLng.lat(), e.latLng.lng());
      });
    } else {
      pinRef.current.setPosition(pin);
    }
  }, [pin, ready]);

  // Recenter on demand
  useEffect(() => {
    if (!ready || !mapRef.current || !center) return;
    mapRef.current.panTo(center);
  }, [center?.lat, center?.lng, ready]);

  return (
    <div className={cn("relative overflow-hidden rounded-xl border bg-muted", className)}>
      <div ref={containerRef} className="h-full w-full" />
      {!ready && !error && (
        <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
          Cargando mapa…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
