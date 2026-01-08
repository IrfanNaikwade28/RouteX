import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { MapContainer } from '@/components/maps/MapContainer';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/auth/AuthContext';
import { driverAPI } from '@/lib/api';
import { DriverTask, DriverRoute, ClientContact } from '@/types/driver';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTrackingSocket } from '@/hooks/useTrackingSocket';
import { DriverLocation } from '@/types/tracking';

const navItems = [
  { label: 'Dashboard', path: '/driver', icon: 'fas fa-home' },
  { label: 'Assignments', path: '/driver/assignments', icon: 'fas fa-clipboard-list' },
  { label: 'Navigation', path: '/driver/navigation', icon: 'fas fa-route' },
];

export default function DriverNavigation() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState<DriverTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<DriverTask | null>(null);
  const [routeData, setRouteData] = useState<DriverRoute | null>(null);
  const [clientContact, setClientContact] = useState<ClientContact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(false);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket tracking for driver (can send location updates)
  const { connectionState, sendLocationUpdate } = useTrackingSocket({
    parcelId: selectedTask?.id || 0,
    autoConnect: !!selectedTask?.id && isTrackingEnabled,
    onError: (error) => {
      console.error('[Driver] Tracking error:', error);
      if (!error.includes('reconnect')) {
        toast.error(`Tracking error: ${error}`);
      }
    },
    onConnectionChange: (state) => {
      console.log(`[Driver] Tracking connection state: ${state}`);
      if (state === 'connected' && isTrackingEnabled) {
        toast.success('Live tracking enabled', { duration: 2000 });
      }
    },
  });

  useEffect(() => {
    loadTasks();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    const parcelId = searchParams.get('parcel');
    if (parcelId && tasks.length > 0) {
      const task = tasks.find(t => t.id === parseInt(parcelId));
      if (task) {
        selectTask(task);
      }
    } else if (tasks.length > 0 && !selectedTask) {
      selectTask(tasks[0]);
    }
  }, [searchParams, tasks]);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const response = await driverAPI.getTasks();
      const activeTasks = response.data.filter((t: DriverTask) => t.current_status !== 'delivered');
      setTasks(activeTasks);
    } catch (error: any) {
      console.error('Failed to load tasks:', error);
      toast.error('Failed to load deliveries');
    } finally {
      setIsLoading(false);
    }
  };

  const selectTask = async (task: DriverTask) => {
    setSelectedTask(task);
    try {
      const [routeRes, contactRes] = await Promise.all([
        driverAPI.getRoute(task.id),
        driverAPI.getClientContact(task.id),
      ]);
      setRouteData(routeRes.data);
      setClientContact(contactRes.data);
    } catch (error: any) {
      console.error('Failed to load task details:', error);
      if (error.response?.status === 404) {
        toast.error('Route coordinates not available');
      }
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation: [number, number] = [position.coords.latitude, position.coords.longitude];
          setCurrentLocation(newLocation);
          
          // Send location update via WebSocket if tracking is enabled
          if (isTrackingEnabled && selectedTask && connectionState === 'connected') {
            sendLocationUpdate({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              address: 'Current location', // Will be geocoded server-side if needed
            });
          }
        },
        (error) => {
          console.error('Failed to get location:', error);
          // Default to Mumbai if geolocation fails
          setCurrentLocation([19.0760, 72.8777]);
        }
      );
    } else {
      setCurrentLocation([19.0760, 72.8777]);
    }
  };

  // Start/stop location tracking
  const toggleTracking = () => {
    if (!selectedTask) {
      toast.error('Please select a delivery first');
      return;
    }

    setIsTrackingEnabled(!isTrackingEnabled);
    
    if (!isTrackingEnabled) {
      // Start tracking
      toast.success('Live tracking started');
      getCurrentLocation(); // Get initial location
    } else {
      // Stop tracking
      toast.info('Live tracking stopped');
    }
  };

  // Periodic location updates when tracking is enabled
  useEffect(() => {
    if (isTrackingEnabled && selectedTask && connectionState === 'connected') {
      // Update location every 5 seconds
      locationIntervalRef.current = setInterval(() => {
        getCurrentLocation();
      }, 5000);
    } else {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
    }

    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, [isTrackingEnabled, selectedTask, connectionState]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTask) return;
    
    try {
      await driverAPI.updateParcelStatus(selectedTask.id, { current_status: newStatus });
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      
      if (newStatus === 'delivered') {
        // Reload tasks after delivery
        await loadTasks();
        setSelectedTask(null);
        setRouteData(null);
        setClientContact(null);
      } else {
        // Just update the selected task
        setSelectedTask({ ...selectedTask, current_status: newStatus as any });
      }
    } catch (error: any) {
      console.error('Failed to update status:', error);
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const statusMap: Record<string, string> = {
      'assigned': 'picked_up',
      'picked_up': 'in_transit',
      'in_transit': 'out_for_delivery',
      'out_for_delivery': 'delivered',
    };
    return statusMap[currentStatus] || null;
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      'assigned': 'Mark as Picked Up',
      'picked_up': 'Start Transit',
      'in_transit': 'Out for Delivery',
      'out_for_delivery': 'Mark as Delivered',
    };
    return labels[status] || status;
  };

  const getMapCenter = (): [number, number] => {
    if (currentLocation) {
      return currentLocation;
    }
    if (routeData) {
      return [(routeData.pickup_lat + routeData.drop_lat) / 2, (routeData.pickup_lng + routeData.drop_lng) / 2];
    }
    return [19.0760, 72.8777];
  };

  const getMapMarkers = () => {
    const markers: Array<{
      id: string;
      position: [number, number];
      type: 'driver' | 'pickup' | 'destination';
      popup?: string;
      label?: string;
    }> = [];

    if (currentLocation) {
      markers.push({
        id: 'driver',
        position: currentLocation,
        type: 'driver',
        popup: 'Your Location',
        label: 'You',
      });
    }

    if (routeData) {
      markers.push(
        {
          id: 'pickup',
          position: [routeData.pickup_lat, routeData.pickup_lng],
          type: 'pickup',
          popup: `Pickup: ${routeData.from_location}`,
          label: 'Pickup',
        },
        {
          id: 'drop',
          position: [routeData.drop_lat, routeData.drop_lng],
          type: 'destination',
          popup: `Drop: ${routeData.to_location}`,
          label: 'Destination',
        }
      );
    }

    return markers;
  };

  if (isLoading) {
    return (
      <DashboardLayout navItems={navItems} title="Navigation">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <i className="fas fa-spinner fa-spin text-4xl text-accent mb-4"></i>
            <p className="text-muted-foreground">Loading navigation...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Navigation">
      <div className="grid lg:grid-cols-4 gap-6 h-[calc(100vh-8rem)]">
        {/* Parcel List */}
        <div className="card-elevated overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Active Deliveries</h3>
            <p className="text-xs text-muted-foreground">{tasks.length} tasks</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {tasks.length === 0 ? (
              <div className="p-6 text-center">
                <i className="fas fa-check-double text-2xl text-success mb-2"></i>
                <p className="text-sm text-muted-foreground">All deliveries completed!</p>
              </div>
            ) : (
              tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => selectTask(task)}
                  className={cn(
                    "w-full p-4 text-left border-b border-border transition-colors",
                    selectedTask?.id === task.id
                      ? "bg-accent/10 border-l-4 border-l-accent"
                      : "hover:bg-secondary/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">
                      {task.tracking_number}
                    </span>
                    <StatusBadge status={task.current_status} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {task.client_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    → {task.to_location}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Map & Controls */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {selectedTask ? (
            <>
              {/* Map */}
              <div className="card-elevated flex-1 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">Route to Destination</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedTask.to_location}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Tracking toggle button */}
                    <button
                      onClick={toggleTracking}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2",
                        isTrackingEnabled
                          ? "bg-green-500 text-white hover:bg-green-600"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      )}
                    >
                      {isTrackingEnabled ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                          <span>Tracking On</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-location-crosshairs"></i>
                          <span>Start Tracking</span>
                        </>
                      )}
                    </button>
                    
                    {/* Connection indicator */}
                    {isTrackingEnabled && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/15 text-accent">
                        {connectionState === 'connected' && (
                          <>
                            <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                            <span className="text-sm font-medium">Live</span>
                          </>
                        )}
                        {connectionState === 'connecting' && (
                          <>
                            <i className="fas fa-spinner fa-spin text-sm"></i>
                            <span className="text-sm">Connecting...</span>
                          </>
                        )}
                        {connectionState === 'error' && (
                          <>
                            <i className="fas fa-exclamation-triangle text-sm text-red-500"></i>
                            <span className="text-sm text-red-600">Error</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="h-[400px] rounded-lg overflow-hidden">
                  {routeData && currentLocation ? (
                    <MapContainer
                      center={getMapCenter()}
                      zoom={13}
                      markers={getMapMarkers()}
                      showRoute={true}
                      routeStart={currentLocation}
                      routeEnd={[routeData.drop_lat, routeData.drop_lng]}
                    />
                  ) : (
                    <div className="h-full bg-secondary/50 rounded-lg flex items-center justify-center">
                      <p className="text-muted-foreground">Loading route...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="card-elevated p-4">
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Client</p>
                    <p className="font-medium">{selectedTask.client_name}</p>
                    {clientContact && (
                      <a
                        href={`tel:${clientContact.client_phone}`}
                        className="text-sm text-accent hover:underline"
                      >
                        {clientContact.client_phone}
                      </a>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Parcel</p>
                    <p className="font-medium">{selectedTask.tracking_number}</p>
                    <p className="text-sm text-muted-foreground">{selectedTask.weight}kg</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <StatusBadge status={selectedTask.current_status} />
                  </div>
                </div>

                {selectedTask.special_instructions && (
                  <div className="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <p className="text-xs text-muted-foreground mb-1">
                      <i className="fas fa-exclamation-triangle mr-1"></i>
                      Special Instructions
                    </p>
                    <p className="text-sm">{selectedTask.special_instructions}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {routeData && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${currentLocation?.[0]},${currentLocation?.[1]}&destination=${routeData.drop_lat},${routeData.drop_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground text-center font-medium hover:bg-primary/90 transition-colors"
                    >
                      <i className="fas fa-map-location-dot mr-2"></i>
                      Open in Google Maps
                    </a>
                  )}
                  {getNextStatus(selectedTask.current_status) && (
                    <button
                      onClick={() => handleUpdateStatus(getNextStatus(selectedTask.current_status)!)}
                      className="flex-1 py-3 rounded-lg bg-accent text-accent-foreground text-center font-medium hover:bg-accent/90 transition-colors"
                    >
                      <i className="fas fa-arrow-right mr-2"></i>
                      {getStatusLabel(selectedTask.current_status)}
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="card-elevated flex-1 flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-route text-4xl text-muted-foreground mb-4"></i>
                <p className="text-muted-foreground">Select a delivery to navigate</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
