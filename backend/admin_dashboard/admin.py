from django.contrib import admin
from .models import Driver, AdminAssignment, DriverLocation


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'phone_number', 'vehicle_number', 'is_active', 'user', 'created_at')
    search_fields = ('name', 'phone_number', 'vehicle_number')


@admin.register(AdminAssignment)
class AdminAssignmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'parcel', 'driver', 'assigned_at')
    search_fields = ('parcel__tracking_number', 'driver__name')


@admin.register(DriverLocation)
class DriverLocationAdmin(admin.ModelAdmin):
    list_display = ('id', 'driver', 'latitude', 'longitude', 'speed', 'updated_at')
    list_filter = ('driver',)
