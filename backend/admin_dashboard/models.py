from django.db import models
from django.conf import settings
from client.models import Parcel

from django.db import models
from django.conf import settings

class Driver(models.Model):
    VEHICLE_TYPE_CHOICES = [
        ('bike', 'Bike'),
        ('car', 'Car'),
        ('van', 'Van'),
        ('mini_truck', 'Mini Truck'),
        ('large_truck', 'Large Truck'),
    ]
    
    name = models.CharField(max_length=255)
    # Added EmailField to match the form input
    email = models.EmailField(max_length=255, unique=True) 
    phone_number = models.CharField(max_length=50)
    
    # Removed blank=True because the form marks these with * (Required)
    vehicle_type = models.CharField(max_length=20, choices=VEHICLE_TYPE_CHOICES, default='mini_truck') 
    vehicle_number = models.CharField(max_length=100) 
    
    # Added Location field
    current_location = models.CharField(max_length=255)
    
    # Added Rating field (assuming 0-5 scale allows decimals, otherwise use IntegerField)
    rating = models.FloatField(default=0.0)
    
    # Renamed to is_available to match "Driver is currently available" checkbox
    is_available = models.BooleanField(default=True)
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='driver_profile'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'admin_drivers'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.vehicle_number})"

        

class AdminAssignment(models.Model):
    parcel = models.OneToOneField(
        Parcel,
        on_delete=models.CASCADE,
        related_name='admin_assignment'
    )
    driver = models.ForeignKey(
        Driver,
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'admin_assignments'
        ordering = ['-assigned_at']

    def __str__(self):
        return f"{self.parcel.tracking_number} -> {self.driver.name}"


class DriverLocation(models.Model):
    driver = models.ForeignKey(
        Driver,
        on_delete=models.CASCADE,
        related_name='locations'
    )
    parcel = models.ForeignKey(
        Parcel,
        on_delete=models.CASCADE,
        related_name='admin_locations',
        null=True,
        blank=True,
    )
    latitude = models.DecimalField(max_digits=10, decimal_places=7)
    longitude = models.DecimalField(max_digits=10, decimal_places=7)
    speed = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'admin_driver_locations'
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.driver.name} @ {self.updated_at}"
