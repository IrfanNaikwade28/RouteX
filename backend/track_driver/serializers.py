from rest_framework import serializers
from django.contrib.auth import get_user_model
from client.models import Parcel
from .models import DriverAssignment, DriverLocation

User = get_user_model()


class DriverTaskSerializer(serializers.ModelSerializer):
    """Serializer for driver tasks (parcels with status='accepted')."""
    
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    client_email = serializers.CharField(source='client.email', read_only=True)
    client_phone = serializers.CharField(source='client.phone_number', read_only=True)
    tracking_number = serializers.CharField(read_only=True)
    from_location = serializers.CharField(read_only=True)
    to_location = serializers.CharField(read_only=True)
    weight = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    description = serializers.CharField(read_only=True)
    special_instructions = serializers.CharField(read_only=True)
    
    # Coordinate fields
    pickup_lat = serializers.DecimalField(max_digits=10, decimal_places=7, read_only=True)
    pickup_lng = serializers.DecimalField(max_digits=10, decimal_places=7, read_only=True)
    drop_lat = serializers.DecimalField(max_digits=10, decimal_places=7, read_only=True)
    drop_lng = serializers.DecimalField(max_digits=10, decimal_places=7, read_only=True)
    
    class Meta:
        model = Parcel
        fields = [
            'id',
            'tracking_number',
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
            'description',
            'special_instructions',
            'current_status',
            'created_at',
            'updated_at'
        ]


class ParcelStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating parcel status."""
    
    class Meta:
        model = Parcel
        fields = ['current_status']
    
    def validate_current_status(self, value):
        """Validate that status transition is valid for driver."""
        allowed_statuses = ['picked_up', 'in_transit', 'out_for_delivery', 'delivered']
        if value not in allowed_statuses:
            raise serializers.ValidationError(
                f"Status must be one of: {', '.join(allowed_statuses)}"
            )
        return value


class RouteSerializer(serializers.ModelSerializer):
    """Serializer for route information (pickup and drop coordinates)."""
    
    pickup_lat = serializers.DecimalField(max_digits=10, decimal_places=7)
    pickup_lng = serializers.DecimalField(max_digits=10, decimal_places=7)
    drop_lat = serializers.DecimalField(max_digits=10, decimal_places=7)
    drop_lng = serializers.DecimalField(max_digits=10, decimal_places=7)
    from_location = serializers.CharField()
    to_location = serializers.CharField()
    
    class Meta:
        model = Parcel
        fields = [
            'id',
            'tracking_number',
            'pickup_lat',
            'pickup_lng',
            'drop_lat',
            'drop_lng',
            'from_location',
            'to_location'
        ]


class DriverLocationSerializer(serializers.ModelSerializer):
    """Serializer for driver location history."""
    
    class Meta:
        model = DriverLocation
        fields = [
            'id',
            'driver',
            'parcel',
            'latitude',
            'longitude',
            'address',
            'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']

