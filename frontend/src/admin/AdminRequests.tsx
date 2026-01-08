import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { ParcelRequest, Driver } from '@/types/admin';
import { cn } from '@/lib/utils';
import { adminAPI } from '@/lib/api';
import { toast } from 'sonner';

const navItems = [
  { label: 'Dashboard', path: '/admin', icon: 'fas fa-home' },
  { label: 'Requests', path: '/admin/requests', icon: 'fas fa-inbox' },
  { label: 'Live Tracking', path: '/admin/tracking', icon: 'fas fa-map-location-dot' },
  { label: 'Drivers', path: '/admin/drivers', icon: 'fas fa-users' },
];

type TabType = 'pending' | 'accepted' | 'assigned' | 'in-transit' | 'delivered';

export default function AdminRequests() {
  const navigate = useNavigate();
  const [parcels, setParcels] = useState<ParcelRequest[]>([]);
  const [allParcels, setAllParcels] = useState<ParcelRequest[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [selectedParcel, setSelectedParcel] = useState<number | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterParcels();
  }, [activeTab, allParcels]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [parcelsRes, driversRes] = await Promise.all([
        adminAPI.getParcelRequests(),
        adminAPI.getDrivers(),
      ]);
      
      console.log('All drivers received:', driversRes.data);
      console.log('Available drivers:', driversRes.data.filter((d: Driver) => d.is_available));
      
      setAllParcels(parcelsRes.data);
      // Show ALL drivers, not just available ones
      setDrivers(driversRes.data);
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      toast.error(error.response?.data?.detail || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const filterParcels = () => {
    const statusMap: Record<TabType, string[]> = {
      pending: ['requested'],
      accepted: ['accepted'],
      assigned: ['assigned'],
      'in-transit': ['in_transit', 'picked_up', 'out_for_delivery'],
      delivered: ['delivered'],
    };

    const filtered = allParcels.filter(p => 
      statusMap[activeTab].includes(p.current_status)
    );
    setParcels(filtered);
  };

  const handleAccept = async (parcelId: number) => {
    try {
      const response = await adminAPI.acceptParcel(parcelId);
      console.log('Accept response:', response);
      toast.success('Parcel accepted successfully');
      await fetchData();
      // Automatically switch to Accepted tab
      setActiveTab('accepted');
    } catch (error: any) {
      console.error('Failed to accept parcel:', error);
      toast.error(error.response?.data?.detail || 'Failed to accept parcel');
    }
  };

  const handleReject = async (parcelId: number) => {
    try {
      await adminAPI.rejectParcel(parcelId, 'Rejected by admin');
      toast.success('Parcel rejected');
      await fetchData();
    } catch (error: any) {
      console.error('Failed to reject parcel:', error);
      toast.error(error.response?.data?.detail || 'Failed to reject parcel');
    }
  };

  const handleAssignDriver = async (parcelId: number) => {
    if (!selectedDriver) {
      toast.error('Please select a driver');
      return;
    }

    try {
      await adminAPI.assignDriver({
        parcel_id: parcelId,
        driver_id: selectedDriver,
      });
      toast.success('Driver assigned successfully');
      setSelectedParcel(null);
      setSelectedDriver(undefined);
      await fetchData();
    } catch (error: any) {
      console.error('Failed to assign driver:', error);
      toast.error(error.response?.data?.detail || 'Failed to assign driver');
    }
  };

  const getTabCounts = () => {
    return {
      pending: allParcels.filter(p => p.current_status === 'requested').length,
      accepted: allParcels.filter(p => p.current_status === 'accepted').length,
      assigned: allParcels.filter(p => p.current_status === 'assigned').length,
      'in-transit': allParcels.filter(p => 
        ['in_transit', 'picked_up', 'out_for_delivery'].includes(p.current_status)
      ).length,
      delivered: allParcels.filter(p => p.current_status === 'delivered').length,
    };
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'pending', label: 'Pending', icon: 'fa-clock' },
    { id: 'accepted', label: 'Accepted', icon: 'fa-check' },
    { id: 'assigned', label: 'Assigned', icon: 'fa-user-check' },
    { id: 'in-transit', label: 'In Transit', icon: 'fa-truck' },
    { id: 'delivered', label: 'Delivered', icon: 'fa-check-double' },
  ];

  const tabCounts = getTabCounts();

  if (isLoading) {
    return (
      <DashboardLayout navItems={navItems} title="Parcel Requests">
        <div className="flex items-center justify-center h-64">
          <i className="fas fa-spinner fa-spin text-4xl text-muted-foreground"></i>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Parcel Requests">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            <i className={`fas ${tab.icon}`}></i>
            {tab.label}
            {tabCounts[tab.id] > 0 && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs",
                activeTab === tab.id ? "bg-primary-foreground/20" : "bg-muted"
              )}>
                {tabCounts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Parcel List */}
      <div className="space-y-4">
        {parcels.length === 0 ? (
          <div className="card-elevated p-12 text-center">
            <i className="fas fa-inbox text-4xl text-muted-foreground mb-4"></i>
            <p className="text-muted-foreground">No {activeTab} requests</p>
          </div>
        ) : (
          parcels.map((parcel) => (
            <motion.div
              key={parcel.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-elevated p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <i className="fas fa-box text-primary"></i>
                  </div>
                  <div>
                    <p className="font-semibold">{parcel.tracking_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {parcel.weight}kg
                    </p>
                  </div>
                </div>
                <StatusBadge status={parcel.current_status} />
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground mb-1">Client</p>
                  <p className="font-medium">{parcel.client_email}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="font-medium text-sm">{parcel.description || 'No description'}</p>
                </div>
              </div>

              {/* Driver Info for Delivered Parcels */}
              {parcel.current_status === 'delivered' && parcel.driver_name && (
                <div className="mb-4 p-3 rounded-lg bg-success/10 border border-success/20">
                  <p className="text-xs text-muted-foreground mb-1">Delivered by</p>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-user-check text-success"></i>
                    <p className="font-medium text-success">{parcel.driver_name}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-info/5 border border-info/20">
                  <i className="fas fa-location-dot text-info mt-0.5"></i>
                  <div>
                    <p className="text-xs text-muted-foreground">Pickup</p>
                    <p>{parcel.from_location}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <i className="fas fa-flag-checkered text-destructive mt-0.5"></i>
                  <div>
                    <p className="text-xs text-muted-foreground">Drop</p>
                    <p>{parcel.to_location}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {parcel.current_status === 'requested' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(parcel.id)}
                    className="flex-1 py-2.5 rounded-lg bg-success text-success-foreground font-medium hover:bg-success/90 transition-colors"
                  >
                    <i className="fas fa-check mr-2"></i>
                    Accept
                  </button>
                  <button
                    onClick={() => handleReject(parcel.id)}
                    className="flex-1 py-2.5 rounded-lg bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 transition-colors"
                  >
                    <i className="fas fa-times mr-2"></i>
                    Reject
                  </button>
                </div>
              )}

              {parcel.current_status === 'accepted' && (
                <div className="space-y-3">
                  {selectedParcel === parcel.id ? (
                    <div className="flex gap-2">
                      <select
                        value={selectedDriver || ''}
                        onChange={(e) => setSelectedDriver(Number(e.target.value))}
                        className="flex-1 input-field"
                      >
                        <option value="">Select a driver ({drivers.length} available)</option>
                        {drivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.name} - {driver.vehicle_type} ({driver.vehicle_number})
                            {driver.is_available ? ' ✓' : ' [Busy]'}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssignDriver(parcel.id)}
                        disabled={!selectedDriver}
                        className="px-4 py-2 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
                      >
                        Assign
                      </button>
                      <button
                        onClick={() => {
                          setSelectedParcel(null);
                          setSelectedDriver(undefined);
                        }}
                        className="px-4 py-2 rounded-lg bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedParcel(parcel.id)}
                      className="w-full py-2.5 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors"
                    >
                      <i className="fas fa-user-plus mr-2"></i>
                      Assign Driver
                    </button>
                  )}
                </div>
              )}

              {['in_transit', 'picked_up', 'out_for_delivery'].includes(parcel.current_status) && (
                <button
                  onClick={() => navigate(`/admin/tracking?parcel=${parcel.id}`)}
                  className="w-full py-2.5 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
                >
                  <i className="fas fa-route"></i>
                  Track Route
                </button>
              )}
            </motion.div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
