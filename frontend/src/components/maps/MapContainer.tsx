import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { Location } from '@/data/mockData';

interface MarkerData {
  id: string;
  position: [number, number];
  type: 'client' | 'driver' | 'destination' | 'pickup';
  label?: string;
  popup?: string;
}

interface MapContainerProps {
  center?: [number, number];
  zoom?: number;
  markers?: MarkerData[];
  showRoute?: boolean;
  routeStart?: [number, number];
  routeEnd?: [number, number];
  onMapClick?: (location: Location) => void;
  className?: string;
  enableClick?: boolean;
  clickMarkerType?: 'pickup' | 'destination';
}

/**
 * Reverse geocoding utility: Convert coordinates to human-readable address
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Formatted address string
 */
const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    // Use Nominatim reverse geocoding API
    // Respect usage policy: https://operations.osmfoundation.org/policies/nominatim/
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'RouteX-ParcelFlow/1.0', // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    // Extract address components
    const addr = data.address || {};
    const parts: string[] = [];

    // Build formatted address: Street, City, State, Country
    if (addr.road || addr.neighbourhood || addr.suburb) {
      parts.push(addr.road || addr.neighbourhood || addr.suburb);
    }
    if (addr.city || addr.town || addr.village) {
      parts.push(addr.city || addr.town || addr.village);
    }
    if (addr.state) {
      parts.push(addr.state);
    }
    if (addr.country) {
      parts.push(addr.country);
    }

    // Return formatted address or fallback to display_name
    return parts.length > 0 ? parts.join(', ') : data.display_name || `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    // Fallback to coordinate display on error
    return `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
  }
};

// Create custom icon factory
const createIcon = (type: MarkerData['type']) => {
  const colors = {
    client: '#0ea5e9',
    pickup: '#0ea5e9',
    driver: '#22c55e',
    destination: '#ef4444',
  };

  const icons = {
    client: 'fa-user',
    pickup: 'fa-location-dot',
    driver: 'fa-truck',
    destination: 'fa-flag-checkered',
  };

  return L.divIcon({
    className: 'custom-marker-container',
    html: `
      <div class="custom-marker marker-${type}" style="background: ${colors[type]};">
        <i class="fas ${icons[type]}"></i>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

export function MapContainer({
  center = [40.7128, -74.006],
  zoom = 13,
  markers = [],
  showRoute = false,
  routeStart,
  routeEnd,
  onMapClick,
  className = '',
  enableClick = false,
  clickMarkerType = 'pickup',
}: MapContainerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const routingControlRef = useRef<L.Routing.Control | null>(null);
  const clickMarkerRef = useRef<L.Marker | null>(null);

  // Handle map click - captures coordinates when user clicks on map
  const handleMapClick = useCallback(async (e: L.LeafletMouseEvent) => {
    if (!enableClick || !onMapClick || !mapRef.current) return;

    const { lat, lng } = e.latlng;

    // Remove previous click marker to allow re-selection
    if (clickMarkerRef.current) {
      mapRef.current.removeLayer(clickMarkerRef.current);
    }

    // Add new marker at clicked position
    const marker = L.marker([lat, lng], {
      icon: createIcon(clickMarkerType),
    }).addTo(mapRef.current);

    clickMarkerRef.current = marker;

    // Show temporary loading popup
    marker.bindPopup('Loading address...').openPopup();

    // Perform reverse geocoding to get human-readable address
    const address = await reverseGeocode(lat, lng);
    
    // Update popup with actual address
    marker.setPopupContent(address).openPopup();

    // Pass location data with real address to parent component
    onMapClick({ lat, lng, address });
  }, [enableClick, onMapClick, clickMarkerType]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView(center, zoom);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Attach/detach click listener when enableClick or handler changes
  useEffect(() => {
    if (!mapRef.current) return;

    if (enableClick) {
      mapRef.current.on('click', handleMapClick);
    } else {
      mapRef.current.off('click', handleMapClick);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', handleMapClick);
      }
    };
  }, [enableClick, handleMapClick]);

  // Update center
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Track which markers we've updated
    const updatedMarkerIds = new Set<string>();

    markers.forEach((markerData) => {
      const existingMarker = markersRef.current.get(markerData.id);

      if (existingMarker) {
        // Update existing marker position
        existingMarker.setLatLng(markerData.position);
      } else {
        // Create new marker
        const marker = L.marker(markerData.position, {
          icon: createIcon(markerData.type),
        }).addTo(mapRef.current!);

        if (markerData.popup) {
          marker.bindPopup(markerData.popup);
        }

        if (markerData.label) {
          marker.bindTooltip(markerData.label, { permanent: false });
        }

        markersRef.current.set(markerData.id, marker);
      }

      updatedMarkerIds.add(markerData.id);
    });

    // Remove markers that are no longer in the list
    markersRef.current.forEach((marker, id) => {
      if (!updatedMarkerIds.has(id)) {
        mapRef.current!.removeLayer(marker);
        markersRef.current.delete(id);
      }
    });
  }, [markers]);

  // Update route
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing route
    if (routingControlRef.current) {
      mapRef.current.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }

    // Add new route if needed
    if (showRoute && routeStart && routeEnd) {
      routingControlRef.current = L.Routing.control({
        waypoints: [
          L.latLng(routeStart[0], routeStart[1]),
          L.latLng(routeEnd[0], routeEnd[1]),
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        show: false,
        lineOptions: {
          styles: [{ color: '#22c55e', weight: 4, opacity: 0.8 }],
          extendToWaypoints: true,
          missingRouteTolerance: 0,
        },
      } as L.Routing.RoutingControlOptions).addTo(mapRef.current);
    }
  }, [showRoute, routeStart, routeEnd]);

  return (
    <div
      ref={mapContainerRef}
      className={`w-full h-full min-h-[300px] rounded-xl ${className}`}
      style={{ zIndex: 0 }}
    />
  );
}
