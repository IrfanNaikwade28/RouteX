import { cn } from '@/lib/utils';

type ParcelStatus = 'requested' | 'accepted' | 'assigned' | 'in_transit' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'rejected';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; class: string; icon: string }> = {
  requested: {
    label: 'Requested',
    class: 'status-requested',
    icon: 'fa-clock',
  },
  accepted: {
    label: 'Accepted',
    class: 'status-accepted',
    icon: 'fa-check',
  },
  assigned: {
    label: 'Assigned',
    class: 'status-in-transit',
    icon: 'fa-user-check',
  },
  in_transit: {
    label: 'In Transit',
    class: 'status-in-transit',
    icon: 'fa-truck',
  },
  picked_up: {
    label: 'Picked Up',
    class: 'status-in-transit',
    icon: 'fa-box-open',
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    class: 'status-in-transit',
    icon: 'fa-shipping-fast',
  },
  delivered: {
    label: 'Delivered',
    class: 'status-delivered',
    icon: 'fa-check-double',
  },
  cancelled: {
    label: 'Cancelled',
    class: 'bg-muted text-muted-foreground',
    icon: 'fa-ban',
  },
  rejected: {
    label: 'Rejected',
    class: 'bg-destructive/15 text-destructive',
    icon: 'fa-times-circle',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.requested;

  return (
    <span className={cn('status-badge', config.class, className)}>
      <i className={cn('fas', config.icon, 'mr-1.5 text-[10px]')}></i>
      {config.label}
    </span>
  );
}
