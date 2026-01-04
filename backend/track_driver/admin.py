from django.contrib import admin
from .models import DriverAssignment, DriverLocation


@admin.register(DriverAssignment)
class DriverAssignmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'parcel', 'driver', 'assigned_at', 'started_at', 'completed_at']
    list_filter = ['assigned_at', 'started_at', 'completed_at']
    search_fields = ['parcel__tracking_number', 'driver__email', 'driver__full_name']
    readonly_fields = ['assigned_at']
    raw_id_fields = ['parcel', 'driver']


@admin.register(DriverLocation)
class DriverLocationAdmin(admin.ModelAdmin):
    list_display = ['id', 'driver', 'parcel', 'latitude', 'longitude', 'address', 'timestamp']
    list_filter = ['timestamp', 'parcel']
    search_fields = ['driver__email', 'driver__full_name', 'parcel__tracking_number', 'address']
    readonly_fields = ['timestamp']
    raw_id_fields = ['driver', 'parcel']
    date_hierarchy = 'timestamp'
