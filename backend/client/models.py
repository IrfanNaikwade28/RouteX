from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal


class PricingRule(models.Model):
    """Pricing rules for parcel delivery based on weight and distance."""
    
    min_weight = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Minimum weight in kg"
    )
    max_weight = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Maximum weight in kg"
    )
    base_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Base price for this weight range"
    )
    price_per_km = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Additional price per kilometer"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'pricing_rules'
        verbose_name = 'Pricing Rule'
        verbose_name_plural = 'Pricing Rules'
        ordering = ['min_weight']
    
    def __str__(self):
        return f"{self.min_weight}kg - {self.max_weight}kg: ₹{self.base_price} + ₹{self.price_per_km}/km"


class Parcel(models.Model):
    """Parcel model for managing parcel deliveries."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('picked_up', 'Picked Up'),
        ('in_transit', 'In Transit'),
        ('out_for_delivery', 'Out for Delivery'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('failed', 'Failed'),
    ]
    
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='parcels'
    )
    tracking_number = models.CharField(max_length=50, unique=True, db_index=True)
    
    # Location details
    from_location = models.CharField(max_length=255)
    to_location = models.CharField(max_length=255)
    pickup_stop_id = models.CharField(max_length=100, blank=True, null=True)
    drop_stop_id = models.CharField(max_length=100, blank=True, null=True)
    
    # Parcel dimensions
    weight = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Weight in kg"
    )
    height = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Height in cm"
    )
    width = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Width in cm"
    )
    breadth = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Breadth in cm"
    )
    
    # Pricing
    price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Total price in ₹"
    )
    distance_km = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Distance in kilometers"
    )
    
    # Status
    current_status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending'
    )
    
    # Additional details
    description = models.TextField(blank=True, null=True)
    special_instructions = models.TextField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'parcels'
        verbose_name = 'Parcel'
        verbose_name_plural = 'Parcels'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['client', '-created_at']),
            models.Index(fields=['tracking_number']),
            models.Index(fields=['current_status']),
        ]
    
    def __str__(self):
        return f"{self.tracking_number} - {self.client.email}"
    
    def calculate_price(self, distance_km=None):
        """Calculate price based on weight and distance using pricing rules."""
        if distance_km:
            self.distance_km = Decimal(str(distance_km))
        
        # Find applicable pricing rule
        pricing_rule = PricingRule.objects.filter(
            is_active=True,
            min_weight__lte=self.weight,
            max_weight__gte=self.weight
        ).first()
        
        if pricing_rule:
            self.price = pricing_rule.base_price + (pricing_rule.price_per_km * self.distance_km)
        else:
            # Default pricing if no rule found
            self.price = Decimal('100.00') + (Decimal('10.00') * self.distance_km)
        
        return self.price


class ParcelStatusHistory(models.Model):
    """Track status changes for parcels."""
    
    parcel = models.ForeignKey(
        Parcel,
        on_delete=models.CASCADE,
        related_name='status_history'
    )
    status = models.CharField(max_length=20, choices=Parcel.STATUS_CHOICES)
    location = models.CharField(max_length=255, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='status_updates'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'parcel_status_history'
        verbose_name = 'Parcel Status History'
        verbose_name_plural = 'Parcel Status Histories'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['parcel', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.parcel.tracking_number} - {self.status} at {self.created_at}"


class Notification(models.Model):
    """Notifications for clients about their parcels."""
    
    NOTIFICATION_TYPES = [
        ('parcel_created', 'Parcel Created'),
        ('status_update', 'Status Update'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('general', 'General'),
    ]
    
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    parcel = models.ForeignKey(
        Parcel,
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True,
        blank=True
    )
    notification_type = models.CharField(
        max_length=20, 
        choices=NOTIFICATION_TYPES,
        default='general'
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notifications'
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['client', '-created_at']),
            models.Index(fields=['is_read']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.client.email}"
