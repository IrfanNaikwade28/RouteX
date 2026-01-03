import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { dataStore } from '@/data/store';
import { Parcel, Driver } from '@/data/mockData';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', path: '/admin', icon: 'fas fa-home' },
  { label: 'Requests', path: '/admin/requests', icon: 'fas fa-inbox' },
  { label: 'Live Tracking', path: '/admin/tracking', icon: 'fas fa-map-location-dot' },
  { label: 'Drivers', path: '/admin/drivers', icon: 'fas fa-users' },
];

type TabType = 'pending' | 'accepted' | 'in-transit' | 'delivered';

export default function AdminRequests() {
  const navigate = useNavigate();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [selectedParcel, setSelectedParcel] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string>('');

  useEffect(() => {
    setParcels(dataStore.getParcels());
    setDrivers(dataStore.getAvailableDrivers());
  }, []);

  const refreshData = () => {
    setParcels(dataStore.getParcels());
    setDrivers(dataStore.getAvailableDrivers());
  };

  const handleAccept = (parcelId: string) => {
    dataStore.acceptParcel(parcelId);
    refreshData();
  };

  const handleReject = (parcelId: string) => {
    dataStore.rejectParcel(parcelId);
    refreshData();
  };

  const handleAssignDriver = (parcelId: string) => {
    if (!selectedDriver) return;
    dataStore.assignDriver(parcelId, selectedDriver);
    setSelectedParcel(null);
    setSelectedDriver('');
    refreshData();
  };

  const statusMap: Record<TabType, string> = {
    pending: 'requested',
    accepted: 'accepted',
    'in-transit': 'in-transit',
    delivered: 'delivered',
  };

  const filteredParcels = parcels.filter(p => p.status === statusMap[activeTab]);

  const tabs: { id: TabType; label: string; icon: string; count: number }[] = [
    { id: 'pending', label: 'Pending', icon: 'fa-clock', count: parcels.filter(p => p.status === 'requested').length },
    { id: 'accepted', label: 'Accepted', icon: 'fa-check', count: parcels.filter(p => p.status === 'accepted').length },
    { id: 'in-transit', label: 'In Transit', icon: 'fa-truck', count: parcels.filter(p => p.status === 'in-transit').length },
    { id: 'delivered', label: 'Delivered', icon: 'fa-check-double', count: parcels.filter(p => p.status === 'delivered').length },
  ];

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
            {tab.count > 0 && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs",
                activeTab === tab.id ? "bg-primary-foreground/20" : "bg-muted"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Parcel List */}
      <div className="space-y-4">
        {filteredParcels.length === 0 ? (
          <div className="card-elevated p-12 text-center">
            <i className="fas fa-inbox text-4xl text-muted-foreground mb-4"></i>
            <p className="text-muted-foreground">No {activeTab} requests</p>
          </div>
        ) : (
          filteredParcels.map((parcel) => (
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
                    <p className="font-semibold">#{parcel.id.slice(-8).toUpperCase()}</p>
                    <p className="text-sm text-muted-foreground">
                      {parcel.parcelType} • {parcel.weight}kg • {parcel.size}{parcel.height && parcel.width ? ` • ${parcel.height}×${parcel.width}m` : ''}
                    </p>
                  </div>
                </div>
                <StatusBadge status={parcel.status} />
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground mb-1">Client</p>
                  <p className="font-medium">{parcel.clientName}</p>
                  <p className="text-sm text-muted-foreground">{parcel.contactNumber}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground mb-1">
                    {parcel.driverName ? 'Assigned Driver' : 'Driver'}
                  </p>
                  <p className="font-medium">
                    {parcel.driverName || 'Not assigned'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-info/5 border border-info/20">
                  <i className="fas fa-location-dot text-info mt-0.5"></i>
                  <div>
                    <p className="text-xs text-muted-foreground">Pickup</p>
                    <p>{parcel.pickupLocation.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <i className="fas fa-flag-checkered text-destructive mt-0.5"></i>
                  <div>
                    <p className="text-xs text-muted-foreground">Drop</p>
                    <p>{parcel.dropLocation.address}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {parcel.status === 'requested' && (
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

              {parcel.status === 'accepted' && (
                <div className="space-y-3">
                  {selectedParcel === parcel.id ? (
                    <div className="flex gap-2">
                      <select
                        value={selectedDriver}
                        onChange={(e) => setSelectedDriver(e.target.value)}
                        className="flex-1 input-field"
                      >
                        <option value="">Select a driver</option>
                        {drivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.name} - {driver.vehicleType} ({driver.vehicleNumber})
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
                          setSelectedDriver('');
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

              {parcel.status === 'in-transit' && (
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
