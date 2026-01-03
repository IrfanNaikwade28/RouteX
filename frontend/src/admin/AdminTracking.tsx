import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { MapContainer } from '@/components/maps/MapContainer';
import { StatusBadge } from '@/components/StatusBadge';
import { dataStore } from '@/data/store';
import { dummySocket } from '@/sockets/dummySocket';
import { Parcel, Location, Driver } from '@/data/mockData';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', path: '/admin', icon: 'fas fa-home' },
  { label: 'Requests', path: '/admin/requests', icon: 'fas fa-inbox' },
  { label: 'Live Tracking', path: '/admin/tracking', icon: 'fas fa-map-location-dot' },
  { label: 'Drivers', path: '/admin/drivers', icon: 'fas fa-users' },
];

interface DriverWithLocation extends Driver {
  liveLocation?: Location;
}

export default function AdminTracking() {
  const [searchParams] = useSearchParams();
  const [activeParcels, setActiveParcels] = useState<Parcel[]>([]);
  const [driversWithLocations, setDriversWithLocations] = useState<DriverWithLocation[]>([]);
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);

  useEffect(() => {
    const parcels = dataStore.getParcels().filter(p => p.status === 'in-transit');
    setActiveParcels(parcels);

    // Get parcel ID from URL params
    const parcelIdFromUrl = searchParams.get('parcel');
    if (parcelIdFromUrl && parcels.some(p => p.id === parcelIdFromUrl)) {
      setSelectedParcelId(parcelIdFromUrl);
    }

    const drivers = dataStore.getDrivers();
    setDriversWithLocations(drivers.map(d => ({ ...d, liveLocation: d.currentLocation })));

    // Start simulation for all active drivers
    parcels.forEach((parcel) => {
      if (parcel.driverId) {
        dummySocket.startDriverSimulation(
          parcel.driverId,
          parcel.pickupLocation,
          parcel.dropLocation,
          120000 // 2 minute journey
        );
      }
    });

    // Subscribe to all driver updates
    const handleLocationUpdate = (driverId: string, location: Location) => {
      setDriversWithLocations(prev =>
        prev.map(d => d.id === driverId ? { ...d, liveLocation: location } : d)
      );
    };

    dummySocket.subscribeAll(handleLocationUpdate);

    return () => {
      dummySocket.unsubscribeAll(handleLocationUpdate);
      parcels.forEach((parcel) => {
        if (parcel.driverId) {
          dummySocket.stopDriverSimulation(parcel.driverId);
        }
      });
    };
  }, []);

  const getMapMarkers = () => {
    const markers: Array<{
      id: string;
      position: [number, number];
      type: 'driver' | 'pickup' | 'destination';
      popup?: string;
      label?: string;
    }> = [];

    // If a parcel is selected, show only its markers
    if (selectedParcelId) {
      const selectedParcel = activeParcels.find(p => p.id === selectedParcelId);
      if (selectedParcel) {
        // Add driver marker for selected parcel
        const driver = driversWithLocations.find(d => d.id === selectedParcel.driverId);
        if (driver?.liveLocation) {
          markers.push({
            id: `driver-${driver.id}`,
            position: [driver.liveLocation.lat, driver.liveLocation.lng],
            type: 'driver',
            popup: `${driver.name} - ${driver.vehicleNumber}`,
            label: driver.name,
          });
        }

        // Add pickup marker
        markers.push({
          id: `pickup-${selectedParcel.id}`,
          position: [selectedParcel.pickupLocation.lat, selectedParcel.pickupLocation.lng],
          type: 'pickup',
          popup: `Pickup: ${selectedParcel.pickupLocation.address}`,
        });

        // Add destination marker
        markers.push({
          id: `drop-${selectedParcel.id}`,
          position: [selectedParcel.dropLocation.lat, selectedParcel.dropLocation.lng],
          type: 'destination',
          popup: `Destination: ${selectedParcel.dropLocation.address}`,
        });
      }
      return markers;
    }

    // Show all markers when no parcel is selected
    // Add driver markers
    driversWithLocations.forEach((driver) => {
      if (driver.liveLocation) {
        markers.push({
          id: `driver-${driver.id}`,
          position: [driver.liveLocation.lat, driver.liveLocation.lng],
          type: 'driver',
          popup: `${driver.name} - ${driver.vehicleNumber}`,
          label: driver.name,
        });
      }
    });

    // Add destination markers for active parcels
    activeParcels.forEach((parcel) => {
      markers.push({
        id: `drop-${parcel.id}`,
        position: [parcel.dropLocation.lat, parcel.dropLocation.lng],
        type: 'destination',
        popup: `Destination: ${parcel.dropLocation.address}`,
      });
    });

    return markers;
  };

  return (
    <DashboardLayout navItems={navItems} title="Live Tracking">
      <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
        {/* Active Deliveries List */}
        <div className="card-elevated overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Active Deliveries</h3>
            <p className="text-sm text-muted-foreground">{activeParcels.length} in transit</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {activeParcels.length === 0 ? (
              <div className="p-8 text-center">
                <i className="fas fa-truck text-3xl text-muted-foreground mb-3"></i>
                <p className="text-muted-foreground">No active deliveries</p>
              </div>
            ) : (
              activeParcels.map((parcel) => {
                const driver = driversWithLocations.find(d => d.id === parcel.driverId);
                const isSelected = selectedParcelId === parcel.id;
                return (
                  <button
                    key={parcel.id}
                    onClick={() => setSelectedParcelId(isSelected ? null : parcel.id)}
                    className={cn(
                      "w-full p-4 border-b border-border text-left transition-colors",
                      isSelected
                        ? "bg-accent/10 border-l-4 border-l-accent"
                        : "hover:bg-secondary/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        #{parcel.id.slice(-8).toUpperCase()}
                      </span>
                      <StatusBadge status={parcel.status} />
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground truncate">
                        <i className="fas fa-user mr-2 text-info"></i>
                        {parcel.clientName}
                      </p>
                      <p className="text-muted-foreground truncate">
                        <i className="fas fa-truck mr-2 text-accent"></i>
                        {driver?.name || 'Unknown'} ({driver?.vehicleNumber})
                      </p>
                      <p className="text-muted-foreground truncate">
                        <i className="fas fa-flag-checkered mr-2 text-destructive"></i>
                        {parcel.dropLocation.address}
                      </p>
                    </div>
                    {driver?.liveLocation && (
                      <div className="mt-2 p-2 rounded bg-accent/10 text-xs">
                        <span className="text-accent font-medium">
                          <i className="fas fa-circle text-[8px] animate-pulse mr-1"></i>
                          Live: {driver.liveLocation.address}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Live Map */}
        <div className="lg:col-span-2 card-elevated p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Live Map</h3>
              <p className="text-sm text-muted-foreground">
                {selectedParcelId 
                  ? `Tracking #${selectedParcelId.slice(-8).toUpperCase()}` 
                  : 'Real-time fleet overview'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {selectedParcelId && (
                <button
                  onClick={() => setSelectedParcelId(null)}
                  className="text-sm text-accent hover:underline flex items-center gap-1"
                >
                  <i className="fas fa-times"></i>
                  Clear Selection
                </button>
              )}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent"></div>
                  <span className="text-muted-foreground">Drivers</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive"></div>
                  <span className="text-muted-foreground">Destinations</span>
                </div>
              </div>
            </div>
          </div>
          <div className="h-[calc(100%-4rem)] rounded-lg overflow-hidden">
            {(() => {
              const selectedParcel = selectedParcelId ? activeParcels.find(p => p.id === selectedParcelId) : null;
              const driver = selectedParcel ? driversWithLocations.find(d => d.id === selectedParcel.driverId) : null;
              
              // Calculate center based on selection
              let center: [number, number] = [40.7128, -74.006];
              if (selectedParcel && driver?.liveLocation) {
                center = [
                  (selectedParcel.pickupLocation.lat + selectedParcel.dropLocation.lat + driver.liveLocation.lat) / 3,
                  (selectedParcel.pickupLocation.lng + selectedParcel.dropLocation.lng + driver.liveLocation.lng) / 3,
                ];
              } else if (selectedParcel) {
                center = [
                  (selectedParcel.pickupLocation.lat + selectedParcel.dropLocation.lat) / 2,
                  (selectedParcel.pickupLocation.lng + selectedParcel.dropLocation.lng) / 2,
                ];
              }

              return (
                <MapContainer
                  center={center}
                  zoom={selectedParcelId ? 13 : 12}
                  markers={getMapMarkers()}
                  showRoute={!!selectedParcel && !!driver?.liveLocation}
                  routeStart={driver?.liveLocation ? [driver.liveLocation.lat, driver.liveLocation.lng] : undefined}
                  routeEnd={selectedParcel ? [selectedParcel.dropLocation.lat, selectedParcel.dropLocation.lng] : undefined}
                />
              );
            })()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
