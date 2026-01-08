import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { MapContainer } from '@/components/maps/MapContainer';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/auth/AuthContext';
import { clientAPI } from '@/lib/api';
import { ParcelList, ParcelDetail, DriverContact } from '@/types/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTrackingSocket } from '@/hooks/useTrackingSocket';
import { DriverLocation } from '@/types/tracking';

const navItems = [
  { label: 'Dashboard', path: '/client', icon: 'fas fa-home' },
  { label: 'Send Parcel', path: '/client/send', icon: 'fas fa-paper-plane' },
  { label: 'Track Parcel', path: '/client/track', icon: 'fas fa-location-crosshairs' },
  { label: 'Profile', path: '/client/profile', icon: 'fas fa-user' },
];

export default function TrackParcel() {
  const { user } = useAuth();
  const [parcels, setParcels] = useState<ParcelList[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<ParcelDetail | null>(null);
  const [driverContact, setDriverContact] = useState<DriverContact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [liveDriverLocation, setLiveDriverLocation] = useState<DriverLocation | null>(null);

  // WebSocket tracking for selected parcel (client is read-only)
  const { connectionState, driverLocation } = useTrackingSocket({
    parcelId: selectedParcel?.id || 0,
    autoConnect: !!selectedParcel?.id,
    onLocationUpdate: (location, driverId) => {
      console.log(`[Client] Received driver location update from driver ${driverId}:`, location);
      setLiveDriverLocation(location);
      toast.success('Driver location updated', { duration: 2000 });
    },
    onError: (error) => {
      console.error('[Client] Tracking error:', error);
      // Only show error toast if it's a critical error, not connection issues
      if (!error.includes('reconnect')) {
        toast.error(`Tracking error: ${error}`);
      }
    },
    onConnectionChange: (state) => {
      console.log(`[Client] Tracking connection state: ${state}`);
    },
  });

  // Load all parcels
  useEffect(() => {
    loadParcels();
  }, []);

  const loadParcels = async () => {
    try {
      setIsLoading(true);
      const response = await clientAPI.getParcels();
      const parcelData = response.data;
      setParcels(parcelData);
      
      // Auto-select first parcel if available
      if (parcelData.length > 0 && !selectedParcel) {
        loadParcelDetail(parcelData[0].id);
      }
    } catch (error: any) {
      console.error('Failed to load parcels:', error);
      toast.error('Failed to load parcels');
    } finally {
      setIsLoading(false);
    }
  };

  // Load selected parcel details
  const loadParcelDetail = async (parcelId: number) => {
    try {
      setIsLoadingDetail(true);
      const response = await clientAPI.getParcel(parcelId);
      const parcelDetail = response.data;
      setSelectedParcel(parcelDetail);

      // Load driver contact if parcel has a driver
      if (parcelDetail.driver) {
        loadDriverContact(parcelId);
      } else {
        setDriverContact(null);
      }
    } catch (error: any) {
      console.error('Failed to load parcel details:', error);
      toast.error('Failed to load parcel details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Load driver contact information
  const loadDriverContact = async (parcelId: number) => {
    try {
      const response = await clientAPI.getDriverContact(parcelId);
      setDriverContact(response.data);
    } catch (error: any) {
      console.error('Failed to load driver contact:', error);
      // Don't show error toast as this is optional info
    }
  };

  // Handle parcel selection
  const handleSelectParcel = (parcel: ParcelList) => {
    loadParcelDetail(parcel.id);
  };

  const getMapMarkers = (): Array<{id: string; position: [number, number]; type: 'client' | 'driver' | 'destination' | 'pickup'; popup?: string; label?: string}> => {
    if (!selectedParcel || !selectedParcel.pickup_lat || !selectedParcel.pickup_lng || !selectedParcel.drop_lat || !selectedParcel.drop_lng) {
      return [];
    }

    const markers: Array<{id: string; position: [number, number]; type: 'client' | 'driver' | 'destination' | 'pickup'; popup?: string; label?: string}> = [
      {
        id: 'pickup',
        position: [Number(selectedParcel.pickup_lat), Number(selectedParcel.pickup_lng)],
        type: 'pickup',
        popup: `Pickup: ${selectedParcel.from_location}`,
        label: 'Pickup',
      },
      {
        id: 'drop',
        position: [Number(selectedParcel.drop_lat), Number(selectedParcel.drop_lng)],
        type: 'destination',
        popup: `Drop: ${selectedParcel.to_location}`,
        label: 'Destination',
      },
    ];

    // Add live driver marker if available
    if (liveDriverLocation) {
      markers.push({
        id: 'driver-live',
        position: [liveDriverLocation.lat, liveDriverLocation.lng],
        type: 'driver',
        popup: `Driver: ${liveDriverLocation.address || 'Current location'}`,
        label: 'Driver',
      });
    }

    return markers;
  };

  const getMapCenter = (): [number, number] => {
    if (!selectedParcel || !selectedParcel.pickup_lat || !selectedParcel.pickup_lng || !selectedParcel.drop_lat || !selectedParcel.drop_lng) {
      // Default center (Mumbai, India)
      return [19.0760, 72.8777];
    }
    return [
      (Number(selectedParcel.pickup_lat) + Number(selectedParcel.drop_lat)) / 2,
      (Number(selectedParcel.pickup_lng) + Number(selectedParcel.drop_lng)) / 2,
    ];
  };

  const hasValidCoordinates = () => {
    if (!selectedParcel) return false;
    
    const { pickup_lat, pickup_lng, drop_lat, drop_lng } = selectedParcel;
    
    // Convert to numbers and validate
    const lat1 = Number(pickup_lat);
    const lng1 = Number(pickup_lng);
    const lat2 = Number(drop_lat);
    const lng2 = Number(drop_lng);
    
    return (
      pickup_lat !== null && 
      pickup_lng !== null && 
      drop_lat !== null && 
      drop_lng !== null &&
      !isNaN(lat1) &&
      !isNaN(lng1) &&
      !isNaN(lat2) &&
      !isNaN(lng2) &&
      isFinite(lat1) &&
      isFinite(lng1) &&
      isFinite(lat2) &&
      isFinite(lng2)
    );
  };

  return (
    <DashboardLayout navItems={navItems} title="Track Parcel">
      <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
        {/* Parcel List */}
        <div className="card-elevated overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Your Parcels</h3>
            <p className="text-sm text-muted-foreground">{parcels.length} total</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <i className="fas fa-spinner fa-spin text-3xl text-muted-foreground mb-3"></i>
                <p className="text-muted-foreground">Loading parcels...</p>
              </div>
            ) : parcels.length === 0 ? (
              <div className="p-8 text-center">
                <i className="fas fa-box-open text-3xl text-muted-foreground mb-3"></i>
                <p className="text-muted-foreground">No parcels to track</p>
              </div>
            ) : (
              parcels.map((parcel) => (
                <button
                  key={parcel.id}
                  onClick={() => handleSelectParcel(parcel)}
                  className={cn(
                    "w-full p-4 text-left border-b border-border transition-colors",
                    selectedParcel?.id === parcel.id
                      ? "bg-accent/10"
                      : "hover:bg-secondary/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">
                      {parcel.tracking_number}
                    </span>
                    <StatusBadge status={parcel.current_status} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {parcel.from_location}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    → {parcel.to_location}
                  </p>
                  <p className="text-xs text-accent mt-1">
                    {parcel.weight}kg • ₹{Number(parcel.price || 0).toFixed(2)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Map & Details */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {isLoadingDetail ? (
            <div className="card-elevated flex-1 flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-spinner fa-spin text-4xl text-accent mb-4"></i>
                <p className="text-muted-foreground">Loading parcel details...</p>
              </div>
            </div>
          ) : selectedParcel ? (
            <>
              {/* Map */}
              <div className="card-elevated flex-1 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">
                      Live Tracking - {selectedParcel.tracking_number}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedParcel.weight}kg
                      {selectedParcel.breadth && ` • ${selectedParcel.breadth}m breadth`}
                      {selectedParcel.height && selectedParcel.width && ` • ${selectedParcel.height}×${selectedParcel.width}m`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={selectedParcel.current_status} />
                    {/* Connection indicator */}
                    <div className="flex items-center gap-2 text-xs">
                      {connectionState === 'connected' && (
                        <>
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-green-600 font-medium">Live</span>
                        </>
                      )}
                      {connectionState === 'connecting' && (
                        <>
                          <i className="fas fa-spinner fa-spin text-yellow-500" />
                          <span className="text-yellow-600">Connecting...</span>
                        </>
                      )}
                      {connectionState === 'disconnected' && (
                        <>
                          <div className="w-2 h-2 rounded-full bg-gray-400" />
                          <span className="text-muted-foreground">Offline</span>
                        </>
                      )}
                      {connectionState === 'error' && (
                        <>
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-red-600">Error</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {hasValidCoordinates() ? (
                  <div className="h-[300px] lg:h-[400px] rounded-lg overflow-hidden">
                    <MapContainer
                      center={getMapCenter()}
                      zoom={13}
                      markers={getMapMarkers()}
                      showRoute={selectedParcel.current_status === 'in_transit' || selectedParcel.current_status === 'out_for_delivery'}
                      routeStart={[Number(selectedParcel.pickup_lat!), Number(selectedParcel.pickup_lng!)]}
                      routeEnd={[Number(selectedParcel.drop_lat!), Number(selectedParcel.drop_lng!)]}
                    />
                  </div>
                ) : (
                  <div className="h-[300px] lg:h-[400px] rounded-lg bg-secondary/50 flex items-center justify-center">
                    <p className="text-muted-foreground">Location data not available</p>
                  </div>
                )}
                {/* Live location info */}
                {liveDriverLocation && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800"
                  >
                    <div className="flex items-start gap-2">
                      <i className="fas fa-location-dot text-green-600 mt-0.5"></i>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                          Driver Current Location
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          {liveDriverLocation.address || `${liveDriverLocation.lat.toFixed(6)}, ${liveDriverLocation.lng.toFixed(6)}`}
                        </p>
                        {liveDriverLocation.timestamp && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            Updated: {new Date(liveDriverLocation.timestamp).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Details */}
              <div className="card-elevated p-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Pickup</p>
                    <p className="text-sm font-medium truncate">{selectedParcel.from_location}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Drop</p>
                    <p className="text-sm font-medium truncate">{selectedParcel.to_location}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Driver</p>
                    <p className="text-sm font-medium">
                      {selectedParcel.driver?.name || driverContact?.driver_name || 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Contact</p>
                    <p className="text-sm font-medium">
                      {selectedParcel.driver?.phone_number || driverContact?.driver_phone || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Driver Info */}
                {(selectedParcel.driver || driverContact) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                        <i className="fas fa-truck text-accent-foreground"></i>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {selectedParcel.driver?.name || driverContact?.driver_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedParcel.driver?.vehicle_type || driverContact?.driver_vehicle} • 
                          {selectedParcel.driver?.vehicle_number || driverContact?.driver_vehicle_number}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="text-sm font-medium text-accent">{selectedParcel.status_display}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Status History */}
                {selectedParcel.status_history && selectedParcel.status_history.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold mb-3">Status History</h4>
                    <div className="space-y-2">
                      {selectedParcel.status_history.map((history, index) => (
                        <div key={history.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              index === 0 ? "bg-accent" : "bg-muted-foreground"
                            )} />
                            {index < selectedParcel.status_history.length - 1 && (
                              <div className="w-0.5 h-full bg-border mt-1" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <p className="text-sm font-medium">{history.status}</p>
                            {history.location && (
                              <p className="text-xs text-muted-foreground">{history.location}</p>
                            )}
                            {history.notes && (
                              <p className="text-xs text-muted-foreground italic">{history.notes}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(history.created_at).toLocaleString()} • {history.created_by_name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card-elevated flex-1 flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-map-location-dot text-4xl text-muted-foreground mb-4"></i>
                <p className="text-muted-foreground">Select a parcel to track</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
