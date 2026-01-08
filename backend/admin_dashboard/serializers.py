from rest_framework import serializers
from .models import Driver, DriverLocation, AdminAssignment
from client.models import Parcel
from django.contrib.auth import get_user_model


class DriverSerializer(serializers.ModelSerializer):
    # Accept a password when creating a driver so we can create a linked User
    # Make it optional for updates
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Driver
        fields = [
            'id', 
            'name', 
            'email',            
            'phone_number', 
            'vehicle_type', 
            'vehicle_number', 
            'current_location', 
            'rating',           
            'is_available',     
            'user', 
            'password',
            'created_at'
        ]

    def create(self, validated_data):
        User = get_user_model()
        password = validated_data.pop('password', None)
        
        if not password:
            raise serializers.ValidationError({'password': 'Password is required when creating a driver.'})

        # Prevent creating driver if a User with this email already exists
        email = validated_data.get('email')
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError({'email': 'A user with this email already exists.'})

        # Create the Driver record first (email and phone_number are stored on Driver)
        driver = super().create(validated_data)

        # Create linked User so driver can log in
        user = User.objects.create(
            email=driver.email,
            full_name=driver.name,
            phone_number=driver.phone_number,
            role='driver'
        )
        user.set_password(password)
        user.save()

        driver.user = user
        driver.save(update_fields=['user'])

        return driver
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        
        # Update driver fields
        instance = super().update(instance, validated_data)
        
        # If password is provided and user exists, update it
        if password and instance.user:
            instance.user.set_password(password)
            instance.user.save()
        
        return instance

class ParcelRequestSerializer(serializers.ModelSerializer):
    client_email = serializers.EmailField(source='client.email', read_only=True)
    driver_name = serializers.SerializerMethodField()

    class Meta:
        model = Parcel
        fields = [
            'id', 'tracking_number', 'client', 'client_email',
            'from_location', 'to_location', 'pickup_lat', 'pickup_lng', 'drop_lat', 'drop_lng',
            'weight', 'description', 'current_status', 'driver_name', 'created_at'
        ]
    
    def get_driver_name(self, obj):
        """Return the driver name if parcel is assigned to a driver."""
        try:
            if hasattr(obj, 'admin_assignment') and obj.admin_assignment:
                return obj.admin_assignment.driver.name
        except AdminAssignment.DoesNotExist:
            pass
        return None


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
