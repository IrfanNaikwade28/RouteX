import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { dataStore } from '@/data/store';
import { Driver } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const navItems = [
  { label: 'Dashboard', path: '/admin', icon: 'fas fa-home' },
  { label: 'Requests', path: '/admin/requests', icon: 'fas fa-inbox' },
  { label: 'Live Tracking', path: '/admin/tracking', icon: 'fas fa-map-location-dot' },
  { label: 'Drivers', path: '/admin/drivers', icon: 'fas fa-users' },
];

// Vehicle type options
const vehicleTypes = ['Mini Truck', 'Large Truck', 'Van', 'Bike', 'Car'];

// Driver form state interface
interface DriverFormData {
  name: string;
  email: string;
  phone: string;
  vehicleType: string;
  vehicleNumber: string;
  isAvailable: boolean;
  rating: number;
  currentLocation: string;
}

export default function AdminDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<DriverFormData>({
    name: '',
    email: '',
    phone: '',
    vehicleType: vehicleTypes[0],
    vehicleNumber: '',
    isAvailable: true,
    rating: 5.0,
    currentLocation: '',
  });
  
  const [formError, setFormError] = useState('');

  // Load drivers on mount
  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = () => {
    setDrivers(dataStore.getDrivers());
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      vehicleType: vehicleTypes[0],
      vehicleNumber: '',
      isAvailable: true,
      rating: 5.0,
      currentLocation: '',
    });
    setFormError('');
    setEditingDriver(null);
  };

  // Open modal for creating new driver
  const handleAddDriver = () => {
    resetForm();
    setIsFormModalOpen(true);
  };

  // Open modal for editing existing driver
  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      vehicleType: driver.vehicleType,
      vehicleNumber: driver.vehicleNumber,
      isAvailable: driver.isAvailable,
      rating: driver.rating,
      currentLocation: driver.currentLocation.address,
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  // Handle form input changes
  const handleInputChange = (field: keyof DriverFormData, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormError(''); // Clear error when user types
  };

  // Validate form data
  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setFormError('Email is required');
      return false;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setFormError('Please enter a valid email address');
      return false;
    }
    if (!formData.phone.trim()) {
      setFormError('Phone number is required');
      return false;
    }
    if (!formData.vehicleNumber.trim()) {
      setFormError('Vehicle number is required');
      return false;
    }
    if (!formData.currentLocation.trim()) {
      setFormError('Current location is required');
      return false;
    }
    if (formData.rating < 0 || formData.rating > 5) {
      setFormError('Rating must be between 0 and 5');
      return false;
    }
    return true;
  };

  // Submit form (create or update)
  const handleSubmitForm = () => {
    if (!validateForm()) return;

    if (editingDriver) {
      // Update existing driver
      const result = dataStore.updateDriver(editingDriver.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        vehicleType: formData.vehicleType,
        vehicleNumber: formData.vehicleNumber,
        isAvailable: formData.isAvailable,
        rating: formData.rating,
        currentLocation: {
          lat: editingDriver.currentLocation.lat, // Keep existing coordinates
          lng: editingDriver.currentLocation.lng,
          address: formData.currentLocation,
        },
      });

      if (result.success) {
        loadDrivers(); // Refresh list
        setIsFormModalOpen(false);
        resetForm();
      } else {
        setFormError(result.error || 'Failed to update driver');
      }
    } else {
      // Create new driver
      const result = dataStore.addDriver({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        vehicleType: formData.vehicleType,
        vehicleNumber: formData.vehicleNumber,
        isAvailable: formData.isAvailable,
        rating: formData.rating,
        currentLocation: {
          lat: 40.7128, // Default coordinates (New York)
          lng: -74.006,
          address: formData.currentLocation,
        },
      });

      if (result.success) {
        loadDrivers(); // Refresh list
        setIsFormModalOpen(false);
        resetForm();
      } else {
        setFormError(result.error || 'Failed to create driver');
      }
    }
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (driver: Driver) => {
    setDriverToDelete(driver);
    setIsDeleteDialogOpen(true);
  };

  // Confirm and execute delete
  const handleConfirmDelete = () => {
    if (!driverToDelete) return;

    const result = dataStore.deleteDriver(driverToDelete.id);
    
    if (result.success) {
      loadDrivers(); // Refresh list
      setIsDeleteDialogOpen(false);
      setDriverToDelete(null);
    } else {
      // Show error (in production, use a toast notification)
      alert(result.error);
      setIsDeleteDialogOpen(false);
      setDriverToDelete(null);
    }
  };

  return (
    <DashboardLayout navItems={navItems} title="Driver Management">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">All Drivers</h2>
          <p className="text-muted-foreground text-sm">{drivers.length} registered drivers</p>
        </div>
        <Button onClick={handleAddDriver} className="gap-2">
          <i className="fas fa-plus"></i>
          Add Driver
        </Button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {drivers.map((driver, index) => (
          <motion.div
            key={driver.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card-elevated p-5"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center",
                driver.isAvailable ? "bg-success/15" : "bg-muted"
              )}>
                <i className={cn(
                  "fas fa-user text-xl",
                  driver.isAvailable ? "text-success" : "text-muted-foreground"
                )}></i>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{driver.name}</h3>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    driver.isAvailable 
                      ? "bg-success/15 text-success" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {driver.isAvailable ? 'Available' : 'Busy'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{driver.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <span className="text-sm text-muted-foreground">Vehicle</span>
                <span className="text-sm font-medium">{driver.vehicleType}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <span className="text-sm text-muted-foreground">Number</span>
                <span className="text-sm font-medium">{driver.vehicleNumber}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <span className="text-sm text-muted-foreground">Phone</span>
                <span className="text-sm font-medium">{driver.phone}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <span className="text-sm text-muted-foreground">Rating</span>
                <div className="flex items-center gap-1">
                  <i className="fas fa-star text-warning text-sm"></i>
                  <span className="text-sm font-medium">{driver.rating.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Current Location</p>
              <p className="text-sm truncate">{driver.currentLocation.address}</p>
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 gap-2"
                onClick={() => handleEditDriver(driver)}
              >
                <i className="fas fa-edit"></i>
                Edit
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                className="flex-1 gap-2"
                onClick={() => handleDeleteClick(driver)}
              >
                <i className="fas fa-trash"></i>
                Delete
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create/Edit Driver Modal */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDriver ? 'Edit Driver' : 'Add New Driver'}
            </DialogTitle>
            <DialogDescription>
              {editingDriver 
                ? 'Update driver information below.' 
                : 'Fill in the details to create a new driver account.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                placeholder="Enter driver name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                placeholder="driver@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone *</label>
              <Input
                placeholder="+1 555-0000"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>

            {/* Vehicle Type */}
            <div className="space-y-2">
              <label htmlFor="vehicleType" className="text-sm font-medium">Vehicle Type *</label>
              <select
                id="vehicleType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formData.vehicleType}
                onChange={(e) => handleInputChange('vehicleType', e.target.value)}
              >
                {vehicleTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Vehicle Number */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Vehicle Number *</label>
              <Input
                placeholder="TRK-001"
                value={formData.vehicleNumber}
                onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
              />
            </div>

            {/* Current Location */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Location *</label>
              <Input
                placeholder="123 Main St, New York"
                value={formData.currentLocation}
                onChange={(e) => handleInputChange('currentLocation', e.target.value)}
              />
            </div>

            {/* Rating */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Rating (0-5)</label>
              <Input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={formData.rating}
                onChange={(e) => handleInputChange('rating', parseFloat(e.target.value))}
              />
            </div>

            {/* Availability Status */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isAvailable"
                checked={formData.isAvailable}
                onChange={(e) => handleInputChange('isAvailable', e.target.checked)}
                className="w-4 h-4 rounded border-input"
              />
              <label htmlFor="isAvailable" className="text-sm font-medium cursor-pointer">
                Driver is currently available
              </label>
            </div>

            {/* Error message */}
            {formError && (
              <div className="p-3 rounded-lg bg-destructive/15 text-destructive text-sm">
                {formError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitForm}>
              {editingDriver ? 'Update Driver' : 'Create Driver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{driverToDelete?.name}</strong> from the system. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDriverToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Driver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

