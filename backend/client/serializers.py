from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Parcel, ParcelStatusHistory, Notification, PricingRule
from decimal import Decimal
import uuid

Client = get_user_model()


class ClientProfileSerializer(serializers.ModelSerializer):
    """Serializer for client profile information."""
    
    name = serializers.CharField(source='full_name')
    
    class Meta:
        model = Client
        fields = ['id', 'name', 'email', 'phone_number', 'address', 'created_at']
        read_only_fields = ['id', 'email', 'created_at']


class ParcelStatusHistorySerializer(serializers.ModelSerializer):
    """Serializer for parcel status history."""
    
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    
    class Meta:
        model = ParcelStatusHistory
        fields = [
            'id', 
            'status', 
            'location', 
            'notes', 
            'created_by_name',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'created_by_name']


class ParcelListSerializer(serializers.ModelSerializer):
    """Serializer for listing parcels (minimal information)."""
    
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    status_display = serializers.CharField(source='get_current_status_display', read_only=True)
    
    class Meta:
        model = Parcel
        fields = [
            'id',
            'tracking_number',
            'client_name',
            'from_location',
            'to_location',
            'weight',
            'price',
            'current_status',
            'status_display',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'tracking_number', 'created_at', 'updated_at']


class ParcelDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed parcel information."""
    
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    client_email = serializers.CharField(source='client.email', read_only=True)
    client_phone = serializers.CharField(source='client.phone_number', read_only=True)
    status_display = serializers.CharField(source='get_current_status_display', read_only=True)
    status_history = ParcelStatusHistorySerializer(many=True, read_only=True)
    driver_location = serializers.SerializerMethodField()
    
    def get_driver_location(self, obj):
        """Get the driver's last known location for this parcel."""
        try:
            from track_driver.models import DriverLocation
            # Get most recent location for this parcel
            last_location = DriverLocation.objects.filter(parcel=obj).order_by('-timestamp').first()
            if last_location:
                return {
                    'lat': float(last_location.latitude),
                    'lng': float(last_location.longitude),
                    'address': last_location.address,
                    'timestamp': last_location.timestamp.isoformat(),
                }
        except Exception as e:
            print(f"Error getting driver location: {e}")
        return None
    
    class Meta:
        model = Parcel
        fields = [
            'id',
            'tracking_number',
            'client',
            'client_name',
            'client_email',
            'client_phone',
            'from_location',
            'to_location',
            'pickup_lat',
            'pickup_lng',
            'drop_lat',
            'drop_lng',
            'weight',
            'height',
            'width',
            'breadth',
            'price',
            'distance_km',
            'current_status',
            'status_display',
            'description',
            'special_instructions',
            'status_history',
            'driver_location',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id', 
            'tracking_number', 
            'client', 
            'price',
            'current_status',
            'created_at', 
            'updated_at'
        ]


class ParcelCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new parcel."""
    
    class Meta:
        model = Parcel
        fields = [
            'from_location',
            'to_location',
            'pickup_lat',
            'pickup_lng',
            'drop_lat',
            'drop_lng',
            'weight',
            'height',
            'width',
            'breadth',
            'description',
            'special_instructions',
            'distance_km'
        ]
    
    def validate_weight(self, value):
        """Validate weight is positive."""
        if value <= 0:
            raise serializers.ValidationError("Weight must be greater than 0.")
        return value
    
    def validate_height(self, value):
        """Validate height is positive."""
        if value <= 0:
            raise serializers.ValidationError("Height must be greater than 0.")
        return value
    
    def validate_width(self, value):
        """Validate width is positive."""
        if value <= 0:
            raise serializers.ValidationError("Width must be greater than 0.")
        return value
    
    def validate_breadth(self, value):
        """Validate breadth is positive."""
        if value <= 0:
            raise serializers.ValidationError("Breadth must be greater than 0.")
        return value
    
    def validate_distance_km(self, value):
        """Validate distance is non-negative."""
        if value < 0:
            raise serializers.ValidationError("Distance cannot be negative.")
        return value
    
    def create(self, validated_data):
        """Create a new parcel with automatic price calculation and tracking number."""
        # Get the client from the request context
        request = self.context.get('request')
        client = request.user
        
        # Generate unique tracking number
        tracking_number = self._generate_tracking_number()
        
        # Create parcel instance
        parcel = Parcel(
            client=client,
            tracking_number=tracking_number,
            **validated_data
        )
        
        # Calculate price based on weight and distance
        distance_km = validated_data.get('distance_km', Decimal('0.00'))
        parcel.calculate_price(distance_km)
        
        # Save the parcel
        parcel.save()
        
        # Set initial status to 'requested' (awaiting admin acceptance)
        parcel.current_status = 'requested'
        parcel.save(update_fields=['current_status'])
        
        # Create initial status history
        ParcelStatusHistory.objects.create(
            parcel=parcel,
            status='requested',
            location=parcel.from_location,
            notes='Parcel created and awaiting admin acceptance',
            created_by=client
        )
        
        # Create notification for parcel creation
        Notification.objects.create(
            client=client,
            parcel=parcel,
            notification_type='parcel_created',
            title='Parcel Created Successfully',
            message=f'Your parcel with tracking number {tracking_number} has been created. '
                   f'Total price: ₹{parcel.price}'
        )
        
        return parcel
    
    def _generate_tracking_number(self):
        """Generate a unique tracking number."""
        while True:
            # Format: PMS-XXXXXXXX (PMS = Parcel Management System)
            tracking_number = f"PMS-{uuid.uuid4().hex[:8].upper()}"
            if not Parcel.objects.filter(tracking_number=tracking_number).exists():
                return tracking_number


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notifications."""
    
    parcel_tracking_number = serializers.CharField(
        source='parcel.tracking_number', 
        read_only=True,
        allow_null=True
    )
    notification_type_display = serializers.CharField(
        source='get_notification_type_display',
        read_only=True
    )
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'parcel',
            'parcel_tracking_number',
            'notification_type',
            'notification_type_display',
            'title',
            'message',
            'is_read',
            'created_at'
        ]
        read_only_fields = [
            'id', 
            'parcel', 
            'notification_type',
            'title',
            'message',
            'created_at'
        ]
    
    def update(self, instance, validated_data):
        """Update notification (mainly for marking as read)."""
        instance.is_read = validated_data.get('is_read', instance.is_read)
        instance.save()
        return instance


class PricingRuleSerializer(serializers.ModelSerializer):
    """Serializer for pricing rules (read-only for clients)."""
    
    class Meta:
        model = PricingRule
        fields = [
            'id',
            'min_weight',
            'max_weight',
            'base_price',
            'price_per_km',
            'is_active'
        ]
        read_only_fields = ['id']
