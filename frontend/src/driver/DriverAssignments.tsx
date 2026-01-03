import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/auth/AuthContext';
import { dataStore } from '@/data/store';
import { Parcel } from '@/data/mockData';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', path: '/driver', icon: 'fas fa-home' },
  { label: 'Assignments', path: '/driver/assignments', icon: 'fas fa-clipboard-list' },
  { label: 'Navigation', path: '/driver/navigation', icon: 'fas fa-route' },
];

type TabType = 'active' | 'completed';

export default function DriverAssignments() {
  const { user } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('active');

  useEffect(() => {
    if (user) {
      setParcels(dataStore.getParcelsByDriver(user.id));
    }
  }, [user]);

  const handleDeliverParcel = (parcelId: string) => {
    dataStore.deliverParcel(parcelId);
    if (user) {
      setParcels(dataStore.getParcelsByDriver(user.id));
    }
  };

  const filteredParcels = parcels.filter(p => 
    activeTab === 'active' ? p.status === 'in-transit' : p.status === 'delivered'
  );

  return (
    <DashboardLayout navItems={navItems} title="Assignments">
      <div className="max-w-4xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'active' as TabType, label: 'Active', icon: 'fa-truck' },
            { id: 'completed' as TabType, label: 'Completed', icon: 'fa-check-double' },
          ].map((tab) => (
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
            </button>
          ))}
        </div>

        {/* Parcel List */}
        <div className="space-y-4">
          {filteredParcels.length === 0 ? (
            <div className="card-elevated p-12 text-center">
              <i className={`fas ${activeTab === 'active' ? 'fa-inbox' : 'fa-box-archive'} text-4xl text-muted-foreground mb-4`}></i>
              <p className="text-muted-foreground">
                No {activeTab === 'active' ? 'active' : 'completed'} deliveries
              </p>
            </div>
          ) : (
            filteredParcels.map((parcel) => (
              <div key={parcel.id} className="card-elevated p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      parcel.status === 'delivered' ? "bg-success/15" : "bg-accent/15"
                    )}>
                      <i className={cn(
                        "fas",
                        parcel.status === 'delivered' ? "fa-check-double text-success" : "fa-box text-accent"
                      )}></i>
                    </div>
                    <div>
                      <p className="font-semibold">#{parcel.id.slice(-8).toUpperCase()}</p>
                      <p className="text-sm text-muted-foreground">{parcel.parcelType} • {parcel.weight}kg • {parcel.size}{parcel.height && parcel.width ? ` • ${parcel.height}×${parcel.width}m` : ''}</p>
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
                    <p className="text-xs text-muted-foreground mb-1">Created</p>
                    <p className="font-medium">{new Date(parcel.createdAt).toLocaleDateString()}</p>
                    <p className="text-sm text-muted-foreground">{new Date(parcel.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
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

                {parcel.status === 'in-transit' && (
                  <div className="mt-4 flex gap-2">
                    <a
                      href={`/driver/navigation?parcel=${parcel.id}`}
                      className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-center font-medium hover:bg-primary/90 transition-colors"
                    >
                      <i className="fas fa-route mr-2"></i>
                      Navigate
                    </a>
                    <button
                      onClick={() => handleDeliverParcel(parcel.id)}
                      className="flex-1 py-2.5 rounded-lg bg-success text-success-foreground text-center font-medium hover:bg-success/90 transition-colors"
                    >
                      <i className="fas fa-check mr-2"></i>
                      Mark Delivered
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
