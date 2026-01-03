import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { MapContainer } from '@/components/maps/MapContainer';
import { useAuth } from '@/auth/AuthContext';
import { dataStore } from '@/data/store';
import { Location, parcelTypes, sizeOptions } from '@/data/mockData';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', path: '/client', icon: 'fas fa-home' },
  { label: 'Send Parcel', path: '/client/send', icon: 'fas fa-paper-plane' },
  { label: 'Track Parcel', path: '/client/track', icon: 'fas fa-location-crosshairs' },
];

type LocationType = 'pickup' | 'drop';

export default function SendParcel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeLocationSelect, setActiveLocationSelect] = useState<LocationType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    senderName: user?.name || '',
    pickupLocation: null as Location | null,
    dropLocation: null as Location | null,
    parcelType: '',
    weight: '',
    size: '',
    height: '',
    width: '',
    contactNumber: user?.phone || '',
  });

  const handleLocationSelect = (location: Location) => {
    if (activeLocationSelect === 'pickup') {
      setFormData({ ...formData, pickupLocation: location });
    } else if (activeLocationSelect === 'drop') {
      setFormData({ ...formData, dropLocation: location });
    }
    setActiveLocationSelect(null);
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
      size: formData.size,
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
                        <span className="flex items-center gap-2">
                          <i className="fas fa-location-dot text-info"></i>
                          {formData.pickupLocation.address}
                        </span>
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
                        <span className="flex items-center gap-2">
                          <i className="fas fa-flag-checkered text-destructive"></i>
                          {formData.dropLocation.address}
                        </span>
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
                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                        className="input-field"
                        placeholder="0.0"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Size
                      </label>
                      <select
                        value={formData.size}
                        onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                        className="input-field"
                        required
                      >
                        <option value="">Select size</option>
                        {sizeOptions.map((size) => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
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
