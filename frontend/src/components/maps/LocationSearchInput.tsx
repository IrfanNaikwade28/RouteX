import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Location } from '@/data/mockData';

interface LocationSearchInputProps {
  value: Location | null;
  onChange: (location: Location) => void;
  onMapClick: () => void;
  placeholder?: string;
  label: string;
  icon?: string;
  showCurrentLocation?: boolean;
  className?: string;
}

interface SearchResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

/**
 * Location Search Input Component
 * Provides text-based location search with autocomplete and optional current location button
 */
export function LocationSearchInput({
  value,
  onChange,
  onMapClick,
  placeholder = 'Search location...',
  label,
  icon = 'fa-location-dot',
  showCurrentLocation = false,
  className = '',
}: LocationSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search locations using Nominatim API
  const searchLocations = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'RouteX-ParcelFlow/1.0',
          },
        }
      );

      if (response.ok) {
        const data: SearchResult[] = await response.json();
        setSearchResults(data);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Location search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search handler
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchLocations(query);
    }, 500); // 500ms debounce
  };

  // Handle search result selection
  const handleSelectResult = (result: SearchResult) => {
    const location: Location = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      address: result.display_name,
    };

    onChange(location);
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
  };

  // Get user's current location using browser geolocation API
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        console.log('Current location:', { lat, lng, accuracy: `${accuracy}m` });

        try {
          // Reverse geocode to get address with higher zoom for more accuracy
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'RouteX-ParcelFlow/1.0',
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            console.log('Reverse geocode result:', data);

            // Build a more accurate address
            const addr = data.address || {};
            let formattedAddress = '';

            // Prioritize building-level details
            if (addr.house_number && addr.road) {
              formattedAddress = `${addr.house_number} ${addr.road}`;
            } else if (addr.road) {
              formattedAddress = addr.road;
            } else if (addr.neighbourhood || addr.suburb) {
              formattedAddress = addr.neighbourhood || addr.suburb;
            }

            // Add locality
            if (addr.city || addr.town || addr.village) {
              formattedAddress += formattedAddress ? ', ' : '';
              formattedAddress += addr.city || addr.town || addr.village;
            }

            // Add state and country
            if (addr.state) {
              formattedAddress += formattedAddress ? ', ' : '';
              formattedAddress += addr.state;
            }

            // Use formatted address or fallback to display_name
            const finalAddress = formattedAddress || data.display_name || `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;

            const location: Location = {
              lat,
              lng,
              address: finalAddress,
            };

            onChange(location);
            console.log('Location set:', location);
          } else {
            throw new Error('Geocoding API request failed');
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          // Fallback to coordinates only
          onChange({
            lat,
            lng,
            address: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`,
          });
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsGettingLocation(false);
        
        let errorMessage = 'Unable to get your location';
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = 'Location permission denied. Please enable location access in your browser.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = 'Location information unavailable. Please check your device settings.';
        } else if (error.code === error.TIMEOUT) {
          errorMessage = 'Location request timed out. Please try again.';
        }
        
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased to 15 seconds
        maximumAge: 0, // Don't use cached position
      }
    );
  };

  // Clear selected location
  const handleClear = () => {
    onChange({ lat: 0, lng: 0, address: '' });
    setSearchQuery('');
  };

  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium text-foreground">
        {label}
      </label>

      <div className="relative" ref={dropdownRef}>
        {/* Selected Location Display or Search Input */}
        {value && value.address ? (
          <div className="relative">
            <div className="w-full p-3 rounded-lg border border-accent bg-accent/5 text-foreground">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <i className={cn('fas', icon, 'text-accent')}></i>
                  <span className="font-medium flex-1 break-words">{value.address}</span>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                    title="Clear location"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div className="text-xs text-muted-foreground pl-6">
                  Lat: {value.lat.toFixed(6)}, Lng: {value.lng.toFixed(6)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <i className={cn('fas', icon)}></i>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                className="input-field pl-10 pr-10"
                placeholder={placeholder}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <i className="fas fa-spinner fa-spin text-muted-foreground"></i>
                </div>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    onClick={() => handleSelectResult(result)}
                    className="w-full px-4 py-3 text-left hover:bg-accent/10 transition-colors border-b border-border last:border-b-0"
                  >
                    <div className="flex items-start gap-2">
                      <i className={cn('fas', icon, 'text-accent mt-1')}></i>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {result.display_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {result.address.city || result.address.state || result.address.country}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Action Buttons Row - Always visible */}
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={onMapClick}
            className="flex-1 px-3 py-2 rounded-lg border border-input hover:border-accent hover:bg-accent/5 transition-all text-sm font-medium text-foreground"
          >
            <i className="fas fa-map-marked-alt mr-2"></i>
            {value && value.address ? 'Change Location' : 'Select on Map'}
          </button>

          {showCurrentLocation && (
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={isGettingLocation}
              className="px-3 py-2 rounded-lg border border-input hover:border-info hover:bg-info/5 transition-all text-sm font-medium text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              title="Use my current location"
            >
              {isGettingLocation ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-location-crosshairs text-info"></i>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
