import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { MapContainer } from '@/components/maps/MapContainer';
import { useAuth } from '@/auth/AuthContext';
import { dataStore } from '@/data/store';
import { Location, parcelTypes } from '@/data/mockData';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', path: '/client', icon: 'fas fa-home' },
  { label: 'Send Parcel', path: '/client/send', icon: 'fas fa-paper-plane' },
  { label: 'Track Parcel', path: '/client/track', icon: 'fas fa-location-crosshairs' },
];

type LocationType = 'pickup' | 'drop';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in kilometers
 */
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

/**
 * Calculate parcel delivery price based on distance and parcel details
 * Pricing Model:
 * - Base Fare: ₹50
 * - Distance: ₹10 per km
 * - Weight: ₹5 per kg
 * - Breadth Multiplier: ≤0.5m (1.0), 0.6-1.0m (1.2), 1.1-1.5m (1.5), >1.5m (1.8)
 */
const calculatePrice = (
  distanceKm: number,
  weightKg: number,
  breadthM: number
): number => {
  const BASE_FARE = 50;
  const DISTANCE_RATE = 10; // ₹ per km
  const WEIGHT_RATE = 5; // ₹ per kg

  // Breadth-based multipliers
  let breadthMultiplier = 1.0;
  if (breadthM <= 0.5) {
    breadthMultiplier = 1.0;
  } else if (breadthM <= 1.0) {
    breadthMultiplier = 1.2;
  } else if (breadthM <= 1.5) {
    breadthMultiplier = 1.5;
  } else {
    breadthMultiplier = 1.8;
  }

  // Calculate total price
  const subtotal = BASE_FARE + (distanceKm * DISTANCE_RATE) + (weightKg * WEIGHT_RATE);
  const total = subtotal * breadthMultiplier;

  return Math.round(total * 100) / 100; // Round to 2 decimal places
};

export default function SendParcel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeLocationSelect, setActiveLocationSelect] = useState<LocationType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [totalDistance, setTotalDistance] = useState<number | null>(null);
  const [priceError, setPriceError] = useState('');

  const [formData, setFormData] = useState({
    senderName: user?.name || '',
    pickupLocation: null as Location | null,
    dropLocation: null as Location | null,
    parcelType: '',
    weight: '',
    breadth: '',
    height: '',
    width: '',
    description: '',
    contactNumber: user?.phone || '',
  });

  const handleLocationSelect = (location: Location) => {
    if (activeLocationSelect === 'pickup') {
      setFormData({ ...formData, pickupLocation: location });
    } else if (activeLocationSelect === 'drop') {
      setFormData({ ...formData, dropLocation: location });
    }
    setActiveLocationSelect(null);
    // Reset calculated price and distance when locations change
    setCalculatedPrice(null);
    setTotalDistance(null);
    setPriceError('');
  };

  /**
   * Helper to update form data and reset price when relevant fields change
   */
  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData({ ...formData, ...updates });
    // Reset price when weight or breadth changes
    if ('weight' in updates || 'breadth' in updates) {
      setCalculatedPrice(null);
      setTotalDistance(null);
      setPriceError('');
    }
  };

  /**
   * Handle Calculate Price button click
   * Validates required fields and calculates total delivery cost
   */
  const handleCalculatePrice = () => {
    setPriceError('');

    // Validation: Check if pickup and drop locations exist
    if (!formData.pickupLocation || !formData.dropLocation) {
      setPriceError('Please select both pickup and drop locations on the map');
      return;
    }

    // Validation: Check if weight is filled
    if (!formData.weight || parseFloat(formData.weight) <= 0) {
      setPriceError('Please enter a valid parcel weight');
      return;
    }

    // Validation: Check if breadth is filled
    if (!formData.breadth || parseFloat(formData.breadth) <= 0) {
      setPriceError('Please enter a valid parcel breadth');
      return;
    }

    // Calculate distance between pickup and drop locations
    const distanceKm = calculateDistance(
      formData.pickupLocation.lat,
      formData.pickupLocation.lng,
      formData.dropLocation.lat,
      formData.dropLocation.lng
    );

    // Store calculated distance (rounded to 2 decimals)
    setTotalDistance(Math.round(distanceKm * 100) / 100);

    // Calculate price based on distance and parcel details
    const price = calculatePrice(
      distanceKm,
      parseFloat(formData.weight),
      parseFloat(formData.breadth)
    );

    setCalculatedPrice(price);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pickupLocation || !formData.dropLocation || !user) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    dataStore.addParcel({
      clientId: user.id,
      clientName: user.name,
      senderName: formData.senderName,
      pickupLocation: formData.pickupLocation,
      dropLocation: formData.dropLocation,
      parcelType: formData.parcelType,
      weight: parseFloat(formData.weight),
      size: 'Medium', // Default size for backward compatibility
      height: formData.height ? parseFloat(formData.height) : undefined,
      width: formData.width ? parseFloat(formData.width) : undefined,
      contactNumber: formData.contactNumber,
      status: 'requested',
    });

    setIsSubmitting(false);
    setSuccess(true);

    setTimeout(() => {
      navigate('/client');
    }, 2000);
  };

  if (success) {
    return (
      <DashboardLayout navItems={navItems} title="Send Parcel">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md mx-auto text-center py-16"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/15 flex items-center justify-center">
            <i className="fas fa-check text-3xl text-success"></i>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Request Submitted!</h2>
          <p className="text-muted-foreground mb-4">
            Your parcel request has been sent to our team. You'll be notified once it's accepted.
          </p>
          <p className="text-sm text-muted-foreground">
            Redirecting to dashboard...
          </p>
        </motion.div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Send Parcel">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">New Parcel Request</h2>
          <p className="text-muted-foreground text-sm">Fill in the details to request a pickup</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Column - Form Fields */}
            <div className="space-y-4">
              <div className="card-elevated p-5">
                <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                  <i className="fas fa-user text-accent"></i>
                  Sender Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Sender Name
                    </label>
                    <input
                      type="text"
                      value={formData.senderName}
                      onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                      className="input-field"
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      value={formData.contactNumber}
                      onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                      className="input-field"
                      placeholder="+1 555-0100"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="card-elevated p-5">
                <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                  <i className="fas fa-map-marker-alt text-accent"></i>
                  Locations
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Pickup Location
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveLocationSelect('pickup')}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left transition-all",
                        formData.pickupLocation
                          ? "border-accent bg-accent/5 text-foreground"
                          : activeLocationSelect === 'pickup'
                            ? "border-accent bg-accent/10"
                            : "border-input hover:border-muted-foreground/30"
                      )}
                    >
                      {formData.pickupLocation ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <i className="fas fa-location-dot text-info"></i>
                            <span className="font-medium">{formData.pickupLocation.address}</span>
                          </div>
                          <div className="text-xs text-muted-foreground pl-6">
                            Lat: {formData.pickupLocation.lat.toFixed(6)}, Lng: {formData.pickupLocation.lng.toFixed(6)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          Click to select on map
                        </span>
                      )}
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Drop Location
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveLocationSelect('drop')}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left transition-all",
                        formData.dropLocation
                          ? "border-accent bg-accent/5 text-foreground"
                          : activeLocationSelect === 'drop'
                            ? "border-accent bg-accent/10"
                            : "border-input hover:border-muted-foreground/30"
                      )}
                    >
                      {formData.dropLocation ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <i className="fas fa-flag-checkered text-destructive"></i>
                            <span className="font-medium">{formData.dropLocation.address}</span>
                          </div>
                          <div className="text-xs text-muted-foreground pl-6">
                            Lat: {formData.dropLocation.lat.toFixed(6)}, Lng: {formData.dropLocation.lng.toFixed(6)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          Click to select on map
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="card-elevated p-5">
                <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                  <i className="fas fa-box text-accent"></i>
                  Parcel Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Parcel Type
                    </label>
                    <select
                      value={formData.parcelType}
                      onChange={(e) => setFormData({ ...formData, parcelType: e.target.value })}
                      className="input-field"
                      required
                    >
                      <option value="">Select type</option>
                      {parcelTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Weight (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.weight}
                        onChange={(e) => updateFormData({ weight: e.target.value })}
                        className="input-field"
                        placeholder="0.0"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Breadth (m)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.breadth}
                        onChange={(e) => updateFormData({ breadth: e.target.value })}
                        className="input-field"
                        placeholder="0.0"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Height (m)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.height}
                        onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                        className="input-field"
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Width (m)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.width}
                        onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                        className="input-field"
                        placeholder="0.0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="input-field min-h-[80px] resize-none"
                      placeholder="Add any special instructions or notes about your parcel..."
                      rows={3}
                    />
                  </div>

                  {/* Calculate Price Section */}
                  <div className="pt-4 border-t border-border">
                    <button
                      type="button"
                      onClick={handleCalculatePrice}
                      className="w-full px-4 py-2 rounded-lg bg-accent/10 text-accent font-medium hover:bg-accent/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-calculator"></i>
                      Calculate Price
                    </button>
                    {priceError && (
                      <div className="mt-3 p-3 rounded-lg bg-destructive/15 text-destructive text-sm">
                        {priceError}
                      </div>
                    )}
                    {totalDistance !== null && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Total Distance
                        </label>
                        <div className="p-3 rounded-lg bg-info/10 border border-info/30">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Route Distance:</span>
                            <span className="text-lg font-semibold text-info">
                              {totalDistance.toFixed(2)} km
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {calculatedPrice !== null && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Total Price
                        </label>
                        <div className="p-3 rounded-lg bg-success/10 border border-success/30">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Estimated Cost:</span>
                            <span className="text-xl font-bold text-success">
                              ₹{calculatedPrice.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Map */}
            <div className="card-elevated p-4 lg:sticky lg:top-20">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium text-foreground">
                  {activeLocationSelect
                    ? `Select ${activeLocationSelect === 'pickup' ? 'Pickup' : 'Drop'} Location`
                    : 'Map Preview'}
                </h3>
                {activeLocationSelect && (
                  <span className="text-xs text-accent animate-pulse">
                    Click on map to select
                  </span>
                )}
              </div>
              <div className="h-[400px] rounded-lg overflow-hidden">
                <MapContainer
                  center={[40.7128, -74.006]}
                  zoom={12}
                  enableClick={!!activeLocationSelect}
                  clickMarkerType={activeLocationSelect === 'pickup' ? 'pickup' : 'destination'}
                  onMapClick={handleLocationSelect}
                  markers={[
                    ...(formData.pickupLocation ? [{
                      id: 'pickup',
                      position: [formData.pickupLocation.lat, formData.pickupLocation.lng] as [number, number],
                      type: 'pickup' as const,
                      popup: 'Pickup Location',
                    }] : []),
                    ...(formData.dropLocation ? [{
                      id: 'drop',
                      position: [formData.dropLocation.lat, formData.dropLocation.lng] as [number, number],
                      type: 'destination' as const,
                      popup: 'Drop Location',
                    }] : []),
                  ]}
                  showRoute={!!(formData.pickupLocation && formData.dropLocation)}
                  routeStart={formData.pickupLocation ? [formData.pickupLocation.lat, formData.pickupLocation.lng] : undefined}
                  routeEnd={formData.dropLocation ? [formData.dropLocation.lat, formData.dropLocation.lng] : undefined}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!formData.pickupLocation || !formData.dropLocation || isSubmitting}
              className="px-8 py-3 rounded-xl bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Submitting...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
