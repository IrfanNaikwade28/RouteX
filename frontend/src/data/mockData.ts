// Types
export type UserRole = 'client' | 'driver' | 'admin';

export type ParcelStatus = 'requested' | 'accepted' | 'in-transit' | 'delivered';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface Parcel {
  id: string;
  clientId: string;
  clientName: string;
  senderName: string;
  pickupLocation: Location;
  dropLocation: Location;
  parcelType: string;
  weight: number;
  size: string;
  height?: number;
  width?: number;
  contactNumber: string;
  status: ParcelStatus;
  driverId?: string;
  driverName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicleNumber: string;
  vehicleType: string;
  currentLocation: Location;
  isAvailable: boolean;
  rating: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  createdAt: Date;
}

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'client-1',
    email: 'john@example.com',
    password: 'password123',
    name: 'John Smith',
    role: 'client',
    phone: '+1 555-0101',
  },
  {
    id: 'client-2',
    email: 'sarah@example.com',
    password: 'password123',
    name: 'Sarah Johnson',
    role: 'client',
    phone: '+1 555-0102',
  },
  {
    id: 'driver-1',
    email: 'mike@parcelflow.com',
    password: 'password123',
    name: 'Mike Wilson',
    role: 'driver',
    phone: '+1 555-0201',
  },
  {
    id: 'driver-2',
    email: 'david@parcelflow.com',
    password: 'password123',
    name: 'David Brown',
    role: 'driver',
    phone: '+1 555-0202',
  },
  {
    id: 'driver-3',
    email: 'alex@parcelflow.com',
    password: 'password123',
    name: 'Alex Turner',
    role: 'driver',
    phone: '+1 555-0203',
  },
  {
    id: 'admin-1',
    email: 'admin@parcelflow.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
    phone: '+1 555-0001',
  },
];

// Mock Drivers with additional details
export const mockDrivers: Driver[] = [
  {
    id: 'driver-1',
    name: 'Mike Wilson',
    email: 'mike@parcelflow.com',
    phone: '+1 555-0201',
    vehicleNumber: 'TRK-001',
    vehicleType: 'Mini Truck',
    currentLocation: { lat: 40.7128, lng: -74.006, address: '123 Main St, New York' },
    isAvailable: true,
    rating: 4.8,
  },
  {
    id: 'driver-2',
    name: 'David Brown',
    email: 'david@parcelflow.com',
    phone: '+1 555-0202',
    vehicleNumber: 'TRK-002',
    vehicleType: 'Large Truck',
    currentLocation: { lat: 40.7580, lng: -73.9855, address: 'Times Square, New York' },
    isAvailable: true,
    rating: 4.5,
  },
  {
    id: 'driver-3',
    name: 'Alex Turner',
    email: 'alex@parcelflow.com',
    phone: '+1 555-0203',
    vehicleNumber: 'TRK-003',
    vehicleType: 'Van',
    currentLocation: { lat: 40.7614, lng: -73.9776, address: '5th Ave, New York' },
    isAvailable: false,
    rating: 4.9,
  },
];

// Mock Parcels
export const initialParcels: Parcel[] = [
  {
    id: 'parcel-1',
    clientId: 'client-1',
    clientName: 'John Smith',
    senderName: 'John Smith',
    pickupLocation: { lat: 40.7128, lng: -74.006, address: '123 Main St, New York' },
    dropLocation: { lat: 40.7580, lng: -73.9855, address: '456 Broadway, New York' },
    parcelType: 'Electronics',
    weight: 2.5,
    size: 'Medium',
    height: 0.3,
    width: 0.4,
    contactNumber: '+1 555-0101',
    status: 'in-transit',
    driverId: 'driver-1',
    driverName: 'Mike Wilson',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'parcel-2',
    clientId: 'client-2',
    clientName: 'Sarah Johnson',
    senderName: 'Sarah Johnson',
    pickupLocation: { lat: 40.7614, lng: -73.9776, address: '789 5th Ave, New York' },
    dropLocation: { lat: 40.7484, lng: -73.9857, address: '350 Park Ave, New York' },
    parcelType: 'Documents',
    weight: 0.5,
    size: 'Small',
    height: 0.15,
    width: 0.2,
    contactNumber: '+1 555-0102',
    status: 'requested',
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16'),
  },
  {
    id: 'parcel-3',
    clientId: 'client-1',
    clientName: 'John Smith',
    senderName: 'John Smith',
    pickupLocation: { lat: 40.7488, lng: -73.9854, address: '200 Madison Ave, New York' },
    dropLocation: { lat: 40.7527, lng: -73.9772, address: 'Grand Central, New York' },
    parcelType: 'Fragile Items',
    weight: 3.0,
    size: 'Large',
    height: 0.5,
    width: 0.6,
    contactNumber: '+1 555-0101',
    status: 'delivered',
    driverId: 'driver-2',
    driverName: 'David Brown',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-12'),
  },
];

// Initial notifications
export const initialNotifications: Notification[] = [
  {
    id: 'notif-1',
    userId: 'client-1',
    title: 'Parcel Delivered',
    message: 'Your parcel #parcel-3 has been successfully delivered.',
    type: 'success',
    read: false,
    createdAt: new Date('2024-01-12'),
  },
  {
    id: 'notif-2',
    userId: 'client-1',
    title: 'Driver Assigned',
    message: 'Mike Wilson has been assigned to your parcel #parcel-1.',
    type: 'info',
    read: true,
    createdAt: new Date('2024-01-15'),
  },
];

// Parcel type options
export const parcelTypes = [
  'Electronics',
  'Documents',
  'Fragile Items',
  'Food & Perishables',
  'Clothing',
  'Furniture',
  'Medical Supplies',
  'Other',
];

// Size options
export const sizeOptions = ['Small', 'Medium', 'Large', 'Extra Large'];
