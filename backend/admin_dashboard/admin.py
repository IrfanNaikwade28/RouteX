from django.contrib import admin
from .models import Driver, AdminAssignment, DriverLocation

from django.contrib import admin
from .models import Driver

@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = (
        'id', 
        'name', 
        'email', 
        'phone_number', 
        'vehicle_type', 
        'vehicle_number', 
        'is_available', 
        'rating', 
        'created_at'
    )
    
    search_fields = ('name', 'email', 'phone_number', 'vehicle_number')
    
    list_filter = ('vehicle_type', 'is_available', 'rating', 'created_at')

@admin.register(AdminAssignment)
class AdminAssignmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'parcel', 'driver', 'assigned_at')
    search_fields = ('parcel__tracking_number', 'driver__name')


@admin.register(DriverLocation)
class DriverLocationAdmin(admin.ModelAdmin):
    list_display = ('id', 'driver', 'latitude', 'longitude', 'speed', 'updated_at')
    list_filter = ('driver',)
