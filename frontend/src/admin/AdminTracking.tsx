import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { MapContainer } from '@/components/maps/MapContainer';
import { StatusBadge } from '@/components/StatusBadge';
import { adminAPI } from '@/lib/api';
import { LiveDriver, LiveParcel, ParcelRoute } from '@/types/admin';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { DriverLocation } from '@/types/tracking';

const navItems = [
  { label: 'Dashboard', path: '/admin', icon: 'fas fa-home' },
  { label: 'Requests', path: '/admin/requests', icon: 'fas fa-inbox' },
  { label: 'Live Tracking', path: '/admin/tracking', icon: 'fas fa-map-location-dot' },
  { label: 'Drivers', path: '/admin/drivers', icon: 'fas fa-users' },
];

export default function AdminTracking() {
  const [searchParams] = useSearchParams();
  const [liveParcels, setLiveParcels] = useState<LiveParcel[]>([]);
  const [liveDrivers, setLiveDrivers] = useState<LiveDriver[]>([]);
  const [selectedParcelId, setSelectedParcelId] = useState<number | null>(null);
  const [selectedParcelRoute, setSelectedParcelRoute] = useState<ParcelRoute | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // WebSocket connections map: parcelId -> WebSocket
  const wsConnectionsRef = useRef<Map<number, WebSocket>>(new Map());
  const reconnectAttemptsRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    loadLiveData();
    
    return () => {
      // Cleanup all WebSocket connections on unmount
      wsConnectionsRef.current.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });
      wsConnectionsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const parcelIdFromUrl = searchParams.get('parcel');
    if (parcelIdFromUrl) {
      const parcelId = parseInt(parcelIdFromUrl);
      if (!isNaN(parcelId)) {
        setSelectedParcelId(parcelId);
        loadParcelRoute(parcelId);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedParcelId) {
      loadParcelRoute(selectedParcelId);
    } else {
      setSelectedParcelRoute(null);
    }
  }, [selectedParcelId]);

  const loadLiveData = async () => {
    try {
      const [parcelsRes, driversRes] = await Promise.all([
        adminAPI.getLiveParcels(),
        adminAPI.getLiveDrivers(),
      ]);

      const parcels = parcelsRes.data as LiveParcel[];
      const drivers = driversRes.data as LiveDriver[];

      setLiveParcels(parcels);
      setLiveDrivers(drivers);
      
      // Connect WebSockets for each active parcel
      parcels.forEach(parcel => {
        if (!wsConnectionsRef.current.has(parcel.id)) {
          connectParcelWebSocket(parcel.id);
        }
      });
      
      // Disconnect WebSockets for parcels no longer active
      wsConnectionsRef.current.forEach((ws, parcelId) => {
        if (!parcels.find(p => p.id === parcelId)) {
          ws.close();
          wsConnectionsRef.current.delete(parcelId);
        }
      });
    } catch (error: any) {
      console.error('Failed to load live tracking data:', error);
      if (!isLoading) {
        toast.error('Failed to load live tracking data');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const connectParcelWebSocket = (parcelId: number) => {
    const tokens = localStorage.getItem('tokens');
    if (!tokens) return;
    
    const { access } = JSON.parse(tokens);
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    const url = `${wsUrl}/ws/tracking/?parcel_id=${parcelId}&token=${access}`;
    
    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log(`[AdminTracking] WebSocket connected for parcel ${parcelId}`);
        reconnectAttemptsRef.current.set(parcelId, 0);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log(`[AdminTracking] Received WebSocket message for parcel ${parcelId}:`, message);
          
          if (message.type === 'driver_location') {
            const location: DriverLocation = {
              lat: message.lat,
              lng: message.lng,
              address: message.address,
              timestamp: message.timestamp,
            };
            
            console.log(`[AdminTracking] Updating driver location for parcel ${parcelId}:`, location);
            
            // Update driver location in state
            setLiveDrivers(prev => {
              const existing = prev.find(d => d.driver_id === message.driver_id);
              if (existing) {
                return prev.map(d => 
                  d.driver_id === message.driver_id
                    ? { ...d, current_location: location }
                    : d
                );
              }
              return prev;
            });
            
            // Update parcel's driver location
            setLiveParcels(prev => {
              const updated = prev.map(p => 
                p.id === parcelId
                  ? { ...p, driver_location: location }
                  : p
              );
              console.log('[AdminTracking] Updated liveParcels:', updated);
              return updated;
            });
          } else if (message.type === 'tracking_ended') {
            // Remove parcel from live tracking when delivered
            ws.close();
            wsConnectionsRef.current.delete(parcelId);
            setLiveParcels(prev => prev.filter(p => p.id !== parcelId));
            toast.info(`Tracking ended for parcel #${parcelId}`);
          }
        } catch (error) {
          console.error(`[AdminTracking] Failed to parse message for parcel ${parcelId}:`, error);
        }
      };
      
      ws.onerror = (error) => {
        console.error(`[AdminTracking] WebSocket error for parcel ${parcelId}:`, error);
      };
      
      ws.onclose = () => {
        console.log(`[AdminTracking] WebSocket closed for parcel ${parcelId}`);
        wsConnectionsRef.current.delete(parcelId);
        
        // Attempt reconnection (max 3 attempts)
        const attempts = reconnectAttemptsRef.current.get(parcelId) || 0;
        if (attempts < 3) {
          setTimeout(() => {
            reconnectAttemptsRef.current.set(parcelId, attempts + 1);
            connectParcelWebSocket(parcelId);
          }, 3000);
        }
      };
      
      wsConnectionsRef.current.set(parcelId, ws);
    } catch (error) {
      console.error(`[AdminTracking] Failed to create WebSocket for parcel ${parcelId}:`, error);
    }
  };

  const loadParcelRoute = async (parcelId: number) => {
    try {
      const response = await adminAPI.getParcelRoute(parcelId);
      setSelectedParcelRoute(response.data);
    } catch (error: any) {
      console.error('Failed to load parcel route:', error);
      if (error.response?.status === 404) {
        toast.error('Route coordinates not available for this parcel');
      }
    }
  };

  const getMapMarkers = () => {
    const markers: Array<{
      id: string;
      position: [number, number];
      type: 'driver' | 'pickup' | 'destination';
      popup?: string;
      label?: string;
    }> = [];

    if (selectedParcelRoute) {
      // Show selected parcel route
      markers.push(
        {
          id: `pickup-${selectedParcelRoute.parcel_id}`,
          position: [selectedParcelRoute.pickup_lat, selectedParcelRoute.pickup_lng],
          type: 'pickup',
          popup: `Pickup: ${selectedParcelRoute.from_location}`,
          label: 'Pickup',
        },
        {
          id: `drop-${selectedParcelRoute.parcel_id}`,
          position: [selectedParcelRoute.drop_lat, selectedParcelRoute.drop_lng],
          type: 'destination',
          popup: `Drop: ${selectedParcelRoute.to_location}`,
          label: 'Destination',
        }
      );

      // Show driver location if available
      const parcel = liveParcels.find(p => p.id === selectedParcelRoute.parcel_id);
      
      console.log('[AdminTracking] Checking driver location for parcel:', {
        parcelId: selectedParcelRoute.parcel_id,
        parcel,
        hasDriverLocation: !!parcel?.driver_location,
        driverLocation: parcel?.driver_location
      });
      
      // Check for driver location from WebSocket updates
      if (parcel?.driver_location) {
        console.log('[AdminTracking] Adding live driver marker:', parcel.driver_location);
        markers.push({
          id: `driver-live-${selectedParcelRoute.parcel_id}`,
          position: [parcel.driver_location.lat, parcel.driver_location.lng],
          type: 'driver',
          popup: `Driver: ${selectedParcelRoute.driver?.driver_name || 'Unknown'} (Live)`,
          label: selectedParcelRoute.driver?.driver_name,
        });
      } else {
        console.log('[AdminTracking] No driver_location found, checking fallback driver data');
        // Fallback to driver data from initial load
        const driverData = liveDrivers.find(d => d.driver_id === selectedParcelRoute.driver?.driver_id);
        console.log('[AdminTracking] Fallback driver data:', driverData);
        if (driverData && driverData.latitude && driverData.longitude) {
          markers.push({
            id: `driver-${driverData.driver_id}`,
            position: [Number(driverData.latitude), Number(driverData.longitude)],
            type: 'driver',
            popup: `Driver: ${selectedParcelRoute.driver?.driver_name || 'Unknown'}`,
            label: selectedParcelRoute.driver?.driver_name,
          });
        }
      }
    } else {
      // Show all active drivers
      liveDrivers.forEach(driver => {
        if (driver.latitude && driver.longitude) {
          markers.push({
            id: `driver-${driver.driver_id}`,
            position: [Number(driver.latitude), Number(driver.longitude)],
            type: 'driver',
            popup: `Driver ${driver.driver_id}${driver.parcel_status ? ` • ${driver.parcel_status}` : ''}`,
            label: `Driver ${driver.driver_id}`,
          });
        }
      });

      // Show all active parcel destinations
      liveParcels.forEach(parcel => {
        if (parcel.latitude && parcel.longitude) {
          markers.push({
            id: `parcel-${parcel.parcel_id}`,
            position: [Number(parcel.latitude), Number(parcel.longitude)],
            type: 'destination',
            popup: `Parcel: ${parcel.tracking_number}`,
            label: parcel.tracking_number,
          });
        }
      });
    }

    return markers;
  };

  const getMapCenter = (): [number, number] => {
    if (selectedParcelRoute) {
      // Center between pickup and drop
      return [
        (selectedParcelRoute.pickup_lat + selectedParcelRoute.drop_lat) / 2,
        (selectedParcelRoute.pickup_lng + selectedParcelRoute.drop_lng) / 2,
      ];
    }

    // Default center (Mumbai, India)
    return [19.0760, 72.8777];
  };

  const getDriverInfo = (driverId: number | null) => {
    if (!driverId) return null;
    return liveDrivers.find(d => d.driver_id === driverId);
  };

  if (isLoading) {
    return (
      <DashboardLayout navItems={navItems} title="Live Tracking">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <i className="fas fa-spinner fa-spin text-4xl text-accent mb-4"></i>
            <p className="text-muted-foreground">Loading live tracking data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Live Tracking">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Live Fleet Tracking 🚚</h2>
        <p className="text-muted-foreground mt-1">
          Real-time monitoring of active deliveries • {liveParcels.length} in transit
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        {/* Active Parcels List */}
        <div className="card-elevated overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Active Deliveries</h3>
            <p className="text-sm text-muted-foreground">{liveParcels.length} in transit</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {liveParcels.length === 0 ? (
              <div className="p-8 text-center">
                <i className="fas fa-truck text-3xl text-muted-foreground mb-3"></i>
                <p className="text-muted-foreground">No active deliveries</p>
              </div>
            ) : (
              liveParcels.map((parcel) => {
                const driver = getDriverInfo(parcel.driver_id);
                const isSelected = selectedParcelId === parcel.parcel_id;
                return (
                  <button
                    key={parcel.parcel_id}
                    onClick={() => setSelectedParcelId(isSelected ? null : parcel.parcel_id)}
                    className={cn(
                      "w-full p-4 border-b border-border text-left transition-colors",
                      isSelected
                        ? "bg-accent/10 border-l-4 border-l-accent"
                        : "hover:bg-secondary/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {parcel.tracking_number}
                      </span>
                      <StatusBadge status={parcel.parcel_status} />
                    </div>
                    <div className="space-y-1 text-sm">
                      {driver && (
                        <p className="text-muted-foreground truncate">
                          <i className="fas fa-truck mr-2 text-accent"></i>
                          Driver {driver.driver_id}
                          {driver.assigned_parcel && ` • Assigned`}
                        </p>
                      )}
                      {parcel.latitude && parcel.longitude && (
                        <p className="text-muted-foreground truncate">
                          <i className="fas fa-location-dot mr-2 text-info"></i>
                          {Number(parcel.latitude).toFixed(4)}, {Number(parcel.longitude).toFixed(4)}
                        </p>
                      )}
                      {parcel.driver_location && (
                        <p className="text-green-600 dark:text-green-400 truncate text-xs">
                          <i className="fas fa-circle text-[6px] animate-pulse mr-1"></i>
                          Live: {parcel.driver_location.lat.toFixed(4)}, {parcel.driver_location.lng.toFixed(4)}
                        </p>
                      )}
                    </div>
                    {parcel.driver_location && (
                      <div className="mt-2 p-2 rounded bg-green-500/10 text-xs">
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          <i className="fas fa-circle text-[8px] animate-pulse mr-1"></i>
                          Live tracking active
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
                {selectedParcelRoute
                  ? `Tracking ${selectedParcelRoute.tracking_number}`
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
            <MapContainer
              center={getMapCenter()}
              zoom={selectedParcelId ? 13 : 12}
              markers={getMapMarkers()}
              showRoute={!!selectedParcelRoute}
              routeStart={
                selectedParcelRoute
                  ? [selectedParcelRoute.pickup_lat, selectedParcelRoute.pickup_lng]
                  : undefined
              }
              routeEnd={
                selectedParcelRoute
                  ? [selectedParcelRoute.drop_lat, selectedParcelRoute.drop_lng]
                  : undefined
              }
            />
          </div>

          {/* Selected Parcel Details */}
          {selectedParcelRoute && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 rounded-lg bg-secondary/50 border border-border"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">From</p>
                  <p className="text-sm font-medium">{selectedParcelRoute.from_location}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">To</p>
                  <p className="text-sm font-medium">{selectedParcelRoute.to_location}</p>
                </div>
                {selectedParcelRoute.driver && (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Driver</p>
                      <p className="text-sm font-medium">{selectedParcelRoute.driver.driver_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Vehicle</p>
                      <p className="text-sm font-medium">{selectedParcelRoute.driver.vehicle_number}</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <StatusBadge status={selectedParcelRoute.current_status} />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
