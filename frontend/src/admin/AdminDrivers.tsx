import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Driver, DriverFormData } from '@/types/admin';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminAPI } from '@/lib/api';
import { toast } from 'sonner';
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
const vehicleTypes = ['bike', 'car', 'van', 'mini_truck', 'large_truck'];

// Local form state (different from API type)
interface LocalDriverForm {
  name: string;
  email: string;
  phone_number: string;
  vehicle_type: string;
  vehicle_number: string;
  is_available: boolean;
  rating: number;
  current_location: string;
}

export default function AdminDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<LocalDriverForm>({
    name: '',
    email: '',
    phone_number: '',
    vehicle_type: vehicleTypes[0],
    vehicle_number: '',
    is_available: true,
    rating: 5.0,
    current_location: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  
  const [formError, setFormError] = useState('');

  // Load drivers on mount
  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getDrivers();
      setDrivers(response.data);
    } catch (error: any) {
      console.error('Failed to fetch drivers:', error);
      toast.error(error.response?.data?.detail || 'Failed to load drivers');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone_number: '',
      vehicle_type: vehicleTypes[0],
      vehicle_number: '',
      is_available: true,
      rating: 5.0,
      current_location: '',
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
      phone_number: driver.phone_number,
      vehicle_type: driver.vehicle_type,
      vehicle_number: driver.vehicle_number,
      is_available: driver.is_available,
      rating: driver.rating,
      current_location: driver.current_location || '',
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  // Handle form input changes
  const handleInputChange = (field: keyof LocalDriverForm, value: string | boolean | number) => {
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
    if (!formData.phone_number.trim()) {
      setFormError('Phone number is required');
      return false;
    }
    if (!formData.vehicle_number.trim()) {
      setFormError('Vehicle number is required');
      return false;
    }
    if (formData.rating < 0 || formData.rating > 5) {
      setFormError('Rating must be between 0 and 5');
      return false;
    }
    return true;
  };

  // Submit form (create or update)
  const handleSubmitForm = async () => {
    if (!validateForm()) return;

    try {
      // Prepare data for backend (exclude user field for create/update)
      const dataToSend = {
        name: formData.name,
        email: formData.email,
        phone_number: formData.phone_number,
        vehicle_type: formData.vehicle_type,
        vehicle_number: formData.vehicle_number,
        current_location: formData.current_location || '',
        rating: formData.rating,
        is_available: formData.is_available,
      };

      console.log('Sending driver data:', dataToSend);

      if (editingDriver) {
        // Update existing driver
        await adminAPI.updateDriver(editingDriver.id, dataToSend);
        toast.success('Driver updated successfully');
      } else {
        // Create new driver
        await adminAPI.createDriver(dataToSend);
        toast.success('Driver created successfully');
      }
      await loadDrivers(); // Refresh list
      setIsFormModalOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Failed to save driver:', error);
      console.error('Error response:', error.response?.data);
      const errorData = error.response?.data;
      let errorMessage = 'Failed to save driver';
      
      if (errorData) {
        // Handle field-specific errors
        if (errorData.email) {
          errorMessage = `Email: ${errorData.email[0]}`;
        } else if (errorData.phone_number) {
          errorMessage = `Phone: ${errorData.phone_number[0]}`;
        } else if (errorData.vehicle_number) {
          errorMessage = `Vehicle Number: ${errorData.vehicle_number[0]}`;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.non_field_errors) {
          errorMessage = errorData.non_field_errors[0];
        } else {
          // If we have error data but none of the above, show it as JSON
          errorMessage = JSON.stringify(errorData);
        }
      }
      
      setFormError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (driver: Driver) => {
    setDriverToDelete(driver);
    setIsDeleteDialogOpen(true);
  };

  // Confirm and execute delete
  const handleConfirmDelete = async () => {
    if (!driverToDelete) return;

    try {
      await adminAPI.deleteDriver(driverToDelete.id);
      toast.success('Driver deleted successfully');
      await loadDrivers(); // Refresh list
      setIsDeleteDialogOpen(false);
      setDriverToDelete(null);
    } catch (error: any) {
      console.error('Failed to delete driver:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to delete driver';
      toast.error(errorMessage);
      setIsDeleteDialogOpen(false);
      setDriverToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout navItems={navItems} title="Driver Management">
        <div className="flex items-center justify-center h-64">
          <i className="fas fa-spinner fa-spin text-4xl text-muted-foreground"></i>
        </div>
      </DashboardLayout>
    );
  }

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
                driver.is_available ? "bg-success/15" : "bg-muted"
              )}>
                <i className={cn(
                  "fas fa-user text-xl",
                  driver.is_available ? "text-success" : "text-muted-foreground"
                )}></i>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{driver.name}</h3>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    driver.is_available 
                      ? "bg-success/15 text-success" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {driver.is_available ? 'Available' : 'Busy'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{driver.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <span className="text-sm text-muted-foreground">Vehicle</span>
                <span className="text-sm font-medium">{driver.vehicle_type}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <span className="text-sm text-muted-foreground">Number</span>
                <span className="text-sm font-medium">{driver.vehicle_number}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <span className="text-sm text-muted-foreground">Phone</span>
                <span className="text-sm font-medium">{driver.phone_number}</span>
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
              <p className="text-sm truncate">{driver.current_location || 'Not set'}</p>
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
                value={formData.phone_number}
                onChange={(e) => handleInputChange('phone_number', e.target.value)}
              />
            </div>

            {/* Vehicle Type */}
            <div className="space-y-2">
              <label htmlFor="vehicleType" className="text-sm font-medium">Vehicle Type *</label>
              <select
                id="vehicleType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formData.vehicle_type}
                onChange={(e) => handleInputChange('vehicle_type', e.target.value)}
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
                value={formData.vehicle_number}
                onChange={(e) => handleInputChange('vehicle_number', e.target.value)}
              />
            </div>

            {/* Current Location */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Location</label>
              <Input
                placeholder="123 Main St, New York"
                value={formData.current_location}
                onChange={(e) => handleInputChange('current_location', e.target.value)}
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
                value={isNaN(formData.rating) ? 0 : formData.rating}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  handleInputChange('rating', isNaN(value) ? 0 : value);
                }}
              />
            </div>

            {/* Availability Status */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isAvailable"
                checked={formData.is_available}
                onChange={(e) => handleInputChange('is_available', e.target.checked)}
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

