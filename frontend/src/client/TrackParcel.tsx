import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { MapContainer } from '@/components/maps/MapContainer';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/auth/AuthContext';
import { dataStore } from '@/data/store';
import { dummySocket } from '@/sockets/dummySocket';
import { Parcel, Location } from '@/data/mockData';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', path: '/client', icon: 'fas fa-home' },
  { label: 'Send Parcel', path: '/client/send', icon: 'fas fa-paper-plane' },
  { label: 'Track Parcel', path: '/client/track', icon: 'fas fa-location-crosshairs' },
];

export default function TrackParcel() {
  const { user } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [driverLocation, setDriverLocation] = useState<Location | null>(null);

  useEffect(() => {
    if (user) {
      const userParcels = dataStore.getParcelsByClient(user.id);
      setParcels(userParcels);
      if (userParcels.length > 0 && !selectedParcel) {
        setSelectedParcel(userParcels[0]);
      }
    }
  }, [user]);

  // Subscribe to driver location updates
  useEffect(() => {
    if (!selectedParcel?.driverId || selectedParcel.status !== 'in-transit') {
      setDriverLocation(null);
      return;
    }

    // Start simulation for the driver
    dummySocket.startDriverSimulation(
      selectedParcel.driverId,
      selectedParcel.pickupLocation,
      selectedParcel.dropLocation,
      60000 // 1 minute journey simulation
    );

    const handleLocationUpdate = (driverId: string, location: Location) => {
      if (driverId === selectedParcel.driverId) {
        setDriverLocation(location);
      }
    };

    dummySocket.subscribe(selectedParcel.driverId, handleLocationUpdate);

    return () => {
      dummySocket.unsubscribe(selectedParcel.driverId, handleLocationUpdate);
      dummySocket.stopDriverSimulation(selectedParcel.driverId);
    };
  }, [selectedParcel]);

  const getMapMarkers = (): Array<{id: string; position: [number, number]; type: 'client' | 'driver' | 'destination' | 'pickup'; popup?: string; label?: string}> => {
    if (!selectedParcel) return [];

    const markers: Array<{id: string; position: [number, number]; type: 'client' | 'driver' | 'destination' | 'pickup'; popup?: string; label?: string}> = [
      {
        id: 'pickup',
        position: [selectedParcel.pickupLocation.lat, selectedParcel.pickupLocation.lng],
        type: 'pickup',
        popup: `Pickup: ${selectedParcel.pickupLocation.address}`,
        label: 'Pickup',
      },
      {
        id: 'drop',
        position: [selectedParcel.dropLocation.lat, selectedParcel.dropLocation.lng],
        type: 'destination',
        popup: `Drop: ${selectedParcel.dropLocation.address}`,
        label: 'Destination',
      },
    ];

    if (driverLocation && selectedParcel.status === 'in-transit') {
      markers.push({
        id: 'driver',
        position: [driverLocation.lat, driverLocation.lng],
        type: 'driver',
        popup: `Driver: ${selectedParcel.driverName}`,
        label: selectedParcel.driverName || 'Driver',
      });
    }

    return markers;
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
            {parcels.length === 0 ? (
              <div className="p-8 text-center">
                <i className="fas fa-box-open text-3xl text-muted-foreground mb-3"></i>
                <p className="text-muted-foreground">No parcels to track</p>
              </div>
            ) : (
              parcels.map((parcel) => (
                <button
                  key={parcel.id}
                  onClick={() => setSelectedParcel(parcel)}
                  className={cn(
                    "w-full p-4 text-left border-b border-border transition-colors",
                    selectedParcel?.id === parcel.id
                      ? "bg-accent/10"
                      : "hover:bg-secondary/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">
                      #{parcel.id.slice(-8).toUpperCase()}
                    </span>
                    <StatusBadge status={parcel.status} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {parcel.pickupLocation.address}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    → {parcel.dropLocation.address}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Map & Details */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {selectedParcel ? (
            <>
              {/* Map */}
              <div className="card-elevated flex-1 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">
                      Live Tracking - #{selectedParcel.id.slice(-8).toUpperCase()}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedParcel.parcelType} • {selectedParcel.weight}kg{selectedParcel.height && selectedParcel.width ? ` • ${selectedParcel.height}×${selectedParcel.width}m` : ''}
                    </p>
                  </div>
                  <StatusBadge status={selectedParcel.status} />
                </div>
                <div className="h-[300px] lg:h-[400px] rounded-lg overflow-hidden">
                  <MapContainer
                    center={[
                      (selectedParcel.pickupLocation.lat + selectedParcel.dropLocation.lat) / 2,
                      (selectedParcel.pickupLocation.lng + selectedParcel.dropLocation.lng) / 2,
                    ]}
                    zoom={13}
                    markers={getMapMarkers()}
                    showRoute={selectedParcel.status === 'in-transit'}
                    routeStart={driverLocation 
                      ? [driverLocation.lat, driverLocation.lng]
                      : [selectedParcel.pickupLocation.lat, selectedParcel.pickupLocation.lng]}
                    routeEnd={[selectedParcel.dropLocation.lat, selectedParcel.dropLocation.lng]}
                  />
                </div>
              </div>

              {/* Details */}
              <div className="card-elevated p-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Pickup</p>
                    <p className="text-sm font-medium truncate">{selectedParcel.pickupLocation.address}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Drop</p>
                    <p className="text-sm font-medium truncate">{selectedParcel.dropLocation.address}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Driver</p>
                    <p className="text-sm font-medium">
                      {selectedParcel.driverName || 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Contact</p>
                    <p className="text-sm font-medium">{selectedParcel.contactNumber}</p>
                  </div>
                </div>

                {selectedParcel.status === 'in-transit' && driverLocation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/20"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                        <i className="fas fa-truck text-accent-foreground text-sm"></i>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-accent">Driver is on the way!</p>
                        <p className="text-xs text-muted-foreground">{driverLocation.address}</p>
                      </div>
                    </div>
                  </motion.div>
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
