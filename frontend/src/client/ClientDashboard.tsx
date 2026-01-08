import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/auth/AuthContext';
import { clientAPI } from '@/lib/api';
import { ParcelList, ParcelStats } from '@/types/client';
import { toast } from 'sonner';

const navItems = [
  { label: 'Dashboard', path: '/client', icon: 'fas fa-home' },
  { label: 'Send Parcel', path: '/client/send', icon: 'fas fa-paper-plane' },
  { label: 'Track Parcel', path: '/client/track', icon: 'fas fa-location-crosshairs' },
  { label: 'Profile', path: '/client/profile', icon: 'fas fa-user' },
];

export default function ClientDashboard() {
  const { user } = useAuth();
  const [parcels, setParcels] = useState<ParcelList[]>([]);
  const [stats, setStats] = useState<ParcelStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [parcelsRes, statsRes] = await Promise.all([
        clientAPI.getParcels(),
        clientAPI.getStats(),
      ]);
      setParcels(parcelsRes.data);
      setStats(statsRes.data);
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      toast.error(error.response?.data?.detail || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout navItems={navItems} title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <i className="fas fa-spinner fa-spin text-4xl text-muted-foreground"></i>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Dashboard">
      <div className="max-w-5xl mx-auto w-full">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h2>
          <p className="text-muted-foreground mt-1">
            Here's an overview of your parcels
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Parcels', value: stats?.total_parcels || 0, icon: 'fa-box', color: 'primary' },
            { label: 'In Transit', value: (stats?.in_transit || 0) + (stats?.out_for_delivery || 0), icon: 'fa-truck', color: 'accent' },
            { label: 'Delivered', value: stats?.delivered || 0, icon: 'fa-check-double', color: 'success' },
            { label: 'Pending', value: (stats?.requested || 0) + (stats?.assigned || 0), icon: 'fa-clock', color: 'warning' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card-elevated p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-${stat.color}/15 flex items-center justify-center`}>
                  <i className={`fas ${stat.icon} text-${stat.color}`}></i>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Recent Parcels */}
        <div className="card-elevated">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-lg">Recent Parcels</h3>
            <a href="/client/track" className="text-sm text-accent hover:underline">
              View all
            </a>
            </div>
          <div className="divide-y divide-border">
            {parcels.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                  <i className="fas fa-box-open text-2xl text-muted-foreground"></i>
                </div>
                <p className="text-muted-foreground">No parcels yet</p>
                <a href="/client/send" className="inline-block mt-4 text-accent hover:underline">
                  Send your first parcel →
                </a>
              </div>
            ) : (
              parcels.slice(0, 5).map((parcel, index) => (
                <motion.div
                  key={parcel.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-box text-primary"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-foreground truncate">
                          #{parcel.tracking_number}
                        </p>
                        <StatusBadge status={parcel.current_status} />
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {parcel.from_location} → {parcel.to_location}
                      </p>
                    </div>
                    <div className="hidden sm:block text-right">
                      <p className="text-sm text-muted-foreground">
                        {new Date(parcel.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-accent mt-0.5">
                        <i className="fas fa-indian-rupee-sign mr-1"></i>
                        {parcel.price ? Number(parcel.price).toFixed(2) : 'Pending'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
