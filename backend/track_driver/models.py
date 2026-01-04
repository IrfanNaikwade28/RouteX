from django.db import models
from django.conf import settings
from client.models import Parcel


class DriverAssignment(models.Model):
    """Model to link a Parcel to a Driver (User)."""
    
    parcel = models.OneToOneField(
        Parcel,
        on_delete=models.CASCADE,
        related_name='driver_assignment'
    )
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='driver_assignments'
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'driver_assignments'
        verbose_name = 'Driver Assignment'
        verbose_name_plural = 'Driver Assignments'
        ordering = ['-assigned_at']
        indexes = [
            models.Index(fields=['driver', '-assigned_at']),
            models.Index(fields=['parcel']),
        ]
    
    def __str__(self):
        return f"{self.driver.email} - {self.parcel.tracking_number}"


class DriverLocation(models.Model):
    """Model to store driver location updates."""
    
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='driver_locations'
    )
    parcel = models.ForeignKey(
        Parcel,
        on_delete=models.CASCADE,
        related_name='driver_locations',
        null=True,
        blank=True
    )
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        help_text="Latitude coordinate"
    )
    longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        help_text="Longitude coordinate"
    )
    address = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Address or location description"
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'driver_locations'
        verbose_name = 'Driver Location'
        verbose_name_plural = 'Driver Locations'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['driver', '-timestamp']),
            models.Index(fields=['parcel', '-timestamp']),
            models.Index(fields=['-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.driver.email} - {self.timestamp}"
