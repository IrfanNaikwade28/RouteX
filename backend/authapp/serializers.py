from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import Client


class ClientRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for client registration."""
    
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        min_length=8
    )
    
    class Meta:
        model = Client
        fields = ['id', 'full_name', 'email', 'phone_number', 'password', 'created_at']
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'email': {'required': True},
            'full_name': {'required': True},
            'phone_number': {'required': True}
        }
    
    def validate_email(self, value):
        """Validate that email is unique."""
        if Client.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()
    
    def validate_phone_number(self, value):
        """Validate that phone number is unique."""
        if Client.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
        return value
    
    def create(self, validated_data):
        """Create a new client with hashed password."""
        password = validated_data.pop('password')
        client = Client(**validated_data)
        client.set_password(password)  # Hash the password
        client.save()
        return client


class ClientLoginSerializer(serializers.Serializer):
    """Serializer for client login."""
    
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, data):
        """Validate credentials and authenticate user."""
        email = data.get('email', '').lower()
        password = data.get('password')
        
        if not email or not password:
            raise serializers.ValidationError("Both email and password are required.")
        
        # Check if user exists
        try:
            user = Client.objects.get(email=email)
        except Client.DoesNotExist:
            raise serializers.ValidationError("Invalid credentials.")
        
        # Check if user is active
        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated.")
        
        # Authenticate user
        user = authenticate(username=email, password=password)
        if not user:
            raise serializers.ValidationError("Invalid credentials.")
        
        data['user'] = user
        return data


class ClientSerializer(serializers.ModelSerializer):
    """Serializer for client details."""
    
    class Meta:
        model = Client
        fields = ['id', 'full_name', 'email', 'phone_number', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']
