import { useEffect, useRef, useState } from 'react';
import { C } from '../../../theme';
import { loadGoogleMaps, mapsKeyPresent } from './googleMaps';

// Renders events that have a linked place with coordinates as clickable markers.
// Events have no own lat/lng — they map to their place (event.places.lat/lng).
export const EventsMap = ({ events, onSelect }) => {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!mapsKeyPresent()) return;
    let cancelled = false;
    loadGoogleMaps().then(maps => {
      if (cancelled || !ref.current) return;
      if (!mapRef.current) {
        mapRef.current = new maps.Map(ref.current, {
          center: { lat: 27.9506, lng: -82.4572 }, zoom: 10,
          mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
        });
      }
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
      const bounds = new maps.LatLngBounds();
      let any = false;
      (events || []).forEach(e => {
        const lat = Number(e.places?.lat), lng = Number(e.places?.lng);
        if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) return;
        const marker = new maps.Marker({ position: { lat, lng }, map: mapRef.current, title: e.name });
        marker.addListener('click', () => onSelect && onSelect(e));
        markersRef.current.push(marker);
        bounds.extend({ lat, lng });
        any = true;
      });
      if (any) { mapRef.current.fitBounds(bounds); if (markersRef.current.length === 1) mapRef.current.setZoom(14); }
    }).catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [events, onSelect]);

  const panel = (msg) => (
    <div style={{ height: 560, borderRadius: 16, border: `1px solid ${C.divider}`, background: C.paper,
      display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24,
      fontFamily: 'Albert Sans', fontSize: 13.5, color: C.inkMuted }}>{msg}</div>
  );

  if (!mapsKeyPresent()) return panel('Map view needs a browser Maps key. Set VITE_GOOGLE_MAPS_API_KEY (Maps JavaScript API enabled) in .env, then rebuild.');
  if (error) return panel(`Map error: ${error}`);
  const mapped = (events || []).filter(e => isFinite(Number(e.places?.lat)) && isFinite(Number(e.places?.lng))).length;
  return (
    <div>
      <div style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.inkMuted, marginBottom: 6 }}>{mapped} of {(events || []).length} events have a mapped place</div>
      <div ref={ref} style={{ width: '100%', height: 560, borderRadius: 16, border: `1px solid ${C.divider}` }} />
    </div>
  );
};
