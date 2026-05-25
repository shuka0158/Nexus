'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, X, Loader2, Crosshair, ChevronLeft } from 'lucide-react';

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
  // dedupe consecutive equals (e.g., name === city)
  return parts.filter((v, i, a) => v && v !== a[i - 1]).join(', ');
};

export const MapPicker: React.FC<MapPickerProps> = ({ open, initialQuery = '', onClose, onSelect }) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<PhotonFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PhotonFeature | null>(null);
  const [locating, setLocating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    setResults([]);
    setSelected(null);
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

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(query.trim())}&limit=8`,
        );
        const data = await res.json();
        setResults(data.features ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`);
          const data = await res.json();
          if (data.features?.[0]) {
            setSelected(data.features[0]);
            setQuery(formatAddress(data.features[0]));
            setResults([]);
          }
        } catch { /* ignore */ }
        finally { setLocating(false); }
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const confirm = () => {
    if (!selected) return;
    const addr = formatAddress(selected);
    const [lng, lat] = selected.geometry.coordinates;
    onSelect(addr, lat, lng);
    onClose();
  };

  const mapUrl = selected
    ? (() => {
        const [lng, lat] = selected.geometry.coordinates;
        const d = 0.01;
        return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`;
      })()
    : null;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Fullscreen panel */}
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
              <div className="flex items-center gap-2 px-4 py-3 max-w-3xl mx-auto w-full">
                {selected ? (
                  <button onClick={() => setSelected(null)} className="p-1 rounded text-white/60 hover:text-white hover:bg-white/5" aria-label="Back to results">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                ) : (
                  <MapPin className="w-4 h-4 text-white/70" />
                )}
                <p className="text-sm font-semibold text-white flex-1">{selected ? 'Confirm location' : 'Pick a location'}</p>
                <button onClick={onClose} className="p-2 rounded text-white/50 hover:text-white hover:bg-white/5" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="p-3 flex-shrink-0">
              <div className="max-w-3xl mx-auto w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                    placeholder="Search address, city, place…"
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-[#000000] border border-[#444444] text-sm text-white placeholder:text-[#555555] focus:outline-none focus:border-white"
                  />
                  {loading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 animate-spin" />
                  )}
                </div>

                <button
                  onClick={useMyLocation}
                  disabled={locating}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-[#333333] text-xs text-white/70 hover:text-white hover:border-white transition-colors disabled:opacity-50"
                >
                  {locating
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Crosshair className="w-3.5 h-3.5" />}
                  Use my current location
                </button>
              </div>
            </div>

            {/* Results / Preview */}
            <div className="flex-1 flex flex-col min-h-0">
              {selected ? (
                <div className="flex-1 flex flex-col min-h-0 max-w-3xl mx-auto w-full px-3">
                  {/* Map fills available space */}
                  {mapUrl && (
                    <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-[#333333]">
                      <iframe
                        src={mapUrl}
                        title="Map preview"
                        className="w-full h-full"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="mt-3 p-3 rounded-lg bg-[#111111] border border-[#333333] flex-shrink-0">
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Selected</p>
                    <p className="text-sm text-white">{formatAddress(selected)}</p>
                  </div>
                  <p className="text-[10px] text-white/30 text-center mt-2 mb-1 flex-shrink-0">Map data © OpenStreetMap</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-3 pb-3 min-h-0">
                  <div className="max-w-3xl mx-auto w-full">
                    {results.length > 0 ? (
                      <div className="space-y-1">
                        {results.map((f, i) => (
                          <button
                            key={i}
                            onClick={() => setSelected(f)}
                            className="w-full text-left px-3 py-2 rounded-lg border border-[#222222] hover:border-[#444444] hover:bg-[#111111] transition-all"
                          >
                            <p className="text-sm text-white truncate">{f.properties.name ?? formatAddress(f).split(',')[0]}</p>
                            <p className="text-xs text-white/40 truncate mt-0.5">{formatAddress(f)}</p>
                          </button>
                        ))}
                      </div>
                    ) : query.trim().length >= 2 && !loading ? (
                      <p className="text-center text-xs text-white/30 py-12">No results found.</p>
                    ) : (
                      <p className="text-center text-xs text-white/30 py-12">Search an address or use your current location.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[#222222] flex-shrink-0">
              <div className="px-3 py-3 flex gap-2 max-w-3xl mx-auto w-full">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 rounded-lg border border-[#333333] text-sm text-white/70 hover:text-white hover:border-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirm}
                  disabled={!selected}
                  className="flex-1 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-[#e0e0e0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Use this location
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};
