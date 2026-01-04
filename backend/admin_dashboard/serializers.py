from rest_framework import serializers
from .models import Driver, DriverLocation, AdminAssignment
from client.models import Parcel


class DriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = ['id', 'name', 'phone_number', 'vehicle_number', 'vehicle_type', 'is_active', 'user', 'created_at']


class ParcelRequestSerializer(serializers.ModelSerializer):
    client_email = serializers.EmailField(source='client.email', read_only=True)

    class Meta:
        model = Parcel
        fields = [
            'id', 'tracking_number', 'client', 'client_email',
            'from_location', 'to_location', 'pickup_lat', 'pickup_lng', 'drop_lat', 'drop_lng',
            'weight', 'description', 'current_status', 'created_at'
        ]


class AssignDriverSerializer(serializers.Serializer):
    parcel_id = serializers.IntegerField()
    driver_id = serializers.IntegerField()


class LiveDriverSerializer(serializers.Serializer):
    driver_id = serializers.IntegerField()
    latitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False)
    longitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False)
    speed = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    assigned_parcel = serializers.IntegerField(required=False, allow_null=True)
    parcel_status = serializers.CharField(required=False, allow_null=True)


class LiveParcelSerializer(serializers.Serializer):
    parcel_id = serializers.IntegerField()
    tracking_number = serializers.CharField()
    latitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False)
    longitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False)
    driver_id = serializers.IntegerField(required=False, allow_null=True)
    parcel_status = serializers.CharField()
