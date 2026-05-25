'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, X, Loader2, Crosshair } from 'lucide-react';
import type { Map as LeafletMap, Marker as LeafletMarker, LeafletMouseEvent } from 'leaflet';

interface PhotonFeature {
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
    osm_value?: string;
  };
  geometry: { coordinates: [number, number] };
}

interface MapPickerProps {
  open: boolean;
  initialQuery?: string;
  onClose: () => void;
  onSelect: (address: string, lat?: number, lng?: number) => void;
}

const formatAddress = (f: PhotonFeature): string => {
  const p = f.properties;
  const parts = [
    [p.housenumber, p.street].filter(Boolean).join(' '),
    p.name && p.name !== p.street ? p.name : '',
    p.city,
    p.state,
    p.country,
  ].filter(Boolean);
  return parts.filter((v, i, a) => v && v !== a[i - 1]).join(', ');
};

const DEFAULT_CENTER: [number, number] = [41.7151, 44.8271]; // Tbilisi fallback

export const MapPicker: React.FC<MapPickerProps> = ({ open, initialQuery = '', onClose, onSelect }) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<PhotonFeature[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [reverseLoading, setReverseLoading] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reverse geocode coords → address
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setReverseLoading(true);
    try {
      const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data.features?.[0]) {
        const addr = formatAddress(data.features[0]);
        setSelectedAddress(addr);
        setQuery(addr);
      } else {
        setSelectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      setSelectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setReverseLoading(false);
    }
  }, []);

  // Drop / move the marker on the map
  const placeMarker = useCallback(async (lat: number, lng: number, fly = true) => {
    const L = (await import('leaflet')).default;
    const map = mapRef.current;
    if (!map) return;
    setSelectedCoords({ lat, lng });
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current!.getLatLng();
        setSelectedCoords({ lat: pos.lat, lng: pos.lng });
        reverseGeocode(pos.lat, pos.lng);
      });
    }
    if (fly) map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [reverseGeocode]);

  // Initialize map when modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      // Inject CSS once
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);
      }
      // Fix Leaflet default marker icon paths (broken in bundlers)
      // @ts-expect-error _getIconUrl is private
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Wait one tick so the container has size
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      if (cancelled || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, { zoomControl: true, attributionControl: true })
        .setView(DEFAULT_CENTER, 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      map.on('click', (e: LeafletMouseEvent) => {
        placeMarker(e.latlng.lat, e.latlng.lng, false);
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;

      // Try to geolocate the user for initial center
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (cancelled || !mapRef.current) return;
            mapRef.current.setView([pos.coords.latitude, pos.coords.longitude], 13);
          },
          () => { /* keep default */ },
          { timeout: 4000 },
        );
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
  }, [open, placeMarker, reverseGeocode]);

  // Reset state when opening
  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    setResults([]);
    setSelectedAddress('');
    setSelectedCoords(null);
    setShowSuggestions(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, initialQuery]);

  // Body scroll lock + ESC to close
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // Debounced forward search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 2) { setResults([]); return; }
    if (query === selectedAddress) return; // suppress search right after reverse-geocode

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(query.trim())}&limit=6`,
        );
        const data = await res.json();
        setResults(data.features ?? []);
        setShowSuggestions(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, selectedAddress]);

  const pickResult = (f: PhotonFeature) => {
    const [lng, lat] = f.geometry.coordinates;
    const addr = formatAddress(f);
    setSelectedAddress(addr);
    setQuery(addr);
    setShowSuggestions(false);
    setResults([]);
    placeMarker(lat, lng, true);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        placeMarker(lat, lng, true);
        reverseGeocode(lat, lng);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const confirm = () => {
    if (!selectedCoords) return;
    onSelect(selectedAddress, selectedCoords.lat, selectedCoords.lng);
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
          style={{
            background: '#0d0d0d',
            paddingTop: 'env(safe-area-inset-top, 0)',
            paddingBottom: 'env(safe-area-inset-bottom, 0)',
          }}
        >
          {/* Header */}
          <div className="border-b border-[#222222] flex-shrink-0">
            <div className="flex items-center gap-2 px-4 py-3 max-w-4xl mx-auto w-full">
              <MapPin className="w-4 h-4 text-white/70" />
              <p className="text-sm font-semibold text-white flex-1">Pick a location</p>
              <button onClick={onClose} className="p-2 rounded text-white/50 hover:text-white hover:bg-white/5" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search bar (overlays the map) */}
          <div className="flex-shrink-0 p-3">
            <div className="max-w-4xl mx-auto w-full relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none z-10" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelectedAddress(''); }}
                  onFocus={() => results.length && setShowSuggestions(true)}
                  placeholder="Search address, city, place…"
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-[#000000] border border-[#444444] text-sm text-white placeholder:text-[#555555] focus:outline-none focus:border-white"
                />
                {(searching || reverseLoading) && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 animate-spin" />
                )}
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-lg bg-[#0d0d0d] border border-[#333333] shadow-2xl z-20">
                  {results.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => pickResult(f)}
                      className="w-full text-left px-3 py-2 border-b border-[#222222] last:border-b-0 hover:bg-[#1a1a1a] transition-colors"
                    >
                      <p className="text-sm text-white truncate">{f.properties.name ?? formatAddress(f).split(',')[0]}</p>
                      <p className="text-xs text-white/40 truncate mt-0.5">{formatAddress(f)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 min-h-0 relative">
            <div
              ref={mapContainerRef}
              className="absolute inset-0"
              style={{ background: '#1a1a1a' }}
            />
            {/* "Use my location" floating button */}
            <button
              onClick={useMyLocation}
              disabled={locating}
              className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0d0d0d]/95 border border-[#444444] text-xs text-white hover:border-white transition-colors disabled:opacity-50 shadow-lg"
              title="Use my current location"
            >
              {locating
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Crosshair className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">My location</span>
            </button>
            {/* Hint */}
            {!selectedCoords && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/80 border border-[#333333] text-[11px] text-white/70 pointer-events-none whitespace-nowrap">
                Click anywhere on the map to drop a pin
              </div>
            )}
          </div>

          {/* Selected address bar */}
          {selectedAddress && (
            <div className="border-t border-[#222222] flex-shrink-0">
              <div className="px-3 py-2 max-w-4xl mx-auto w-full">
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Selected</p>
                <p className="text-sm text-white truncate">{selectedAddress}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-[#222222] flex-shrink-0">
            <div className="px-3 py-3 flex gap-2 max-w-4xl mx-auto w-full">
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-lg border border-[#333333] text-sm text-white/70 hover:text-white hover:border-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirm}
                disabled={!selectedCoords}
                className="flex-1 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-[#e0e0e0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Use this location
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
