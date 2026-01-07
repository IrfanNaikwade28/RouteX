export interface Driver {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  vehicle_type: string;
  vehicle_number: string;
  current_location: string;
  rating: number;
  is_available: boolean;
  user: number;
  created_at: string;
}

export interface ParcelRequest {
  id: number;
  tracking_number: string;
  client: number;
  client_email: string;
  from_location: string;
  to_location: string;
  pickup_lat: string;
  pickup_lng: string;
  drop_lat: string;
  drop_lng: string;
  weight: number;
  description: string;
  current_status: 'requested' | 'accepted' | 'assigned' | 'in_transit' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'rejected';
  created_at: string;
}

export interface AdminStats {
  totalParcels: number;
  pendingRequests: number;
  inTransit: number;
  delivered: number;
  activeDrivers: number;
  totalDrivers: number;
}

export interface AssignDriverRequest {
  parcel_id: number;
  driver_id: number;
}

export interface LiveDriver {
  driver_id: number;
  latitude: string | null;
  longitude: string | null;
  speed: string | null;
  assigned_parcel: number | null;
  parcel_status: string | null;
}

export interface LiveParcel {
  parcel_id: number;
  tracking_number: string;
  latitude: string | null;
  longitude: string | null;
  driver_id: number | null;
  parcel_status: string;
}

export interface ParcelRoute {
  parcel_id: number;
  tracking_number: string;
  pickup_lat: number;
  pickup_lng: number;
  drop_lat: number;
  drop_lng: number;
  from_location: string;
  to_location: string;
  driver: {
    driver_id: number;
    driver_name: string;
    driver_phone: string;
    vehicle_number: string;
  } | null;
  current_status: string;
}

export interface DriverFormData {
  name: string;
  email: string;
  phone_number: string;
  vehicle_type: string;
  vehicle_number: string;
  current_location?: string;
  rating?: number;
  is_available?: boolean;
}
