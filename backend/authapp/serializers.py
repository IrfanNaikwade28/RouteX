from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User


class ClientRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""

    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        min_length=8
    )

    class Meta:
        model = User
        fields = ['id', 'full_name', 'email', 'phone_number', 'password', 'role', 'created_at']
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'email': {'required': True},
            'full_name': {'required': True},
            'phone_number': {'required': True},
            'role': {'required': True}
        }

    def validate_email(self, value):
        """Validate that email is unique."""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_phone_number(self, value):
        """Validate that phone number is unique."""
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
        return value

    def create(self, validated_data):
        """Create a new user with hashed password."""
        password = validated_data.pop('password')
        role = validated_data.get('role', 'client')
        user = User(**validated_data)
        user.set_password(password)
        
        # If role is admin, set is_staff and is_superuser
        if role == 'admin':
            user.is_staff = True
            user.is_superuser = True
        
        user.save()
        return user

class ClientLoginSerializer(serializers.Serializer):
    """Serializer for user login."""

    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, required=True)

    def validate(self, data):
        """Validate credentials and authenticate user."""
        email = data.get('email', '').lower()
        password = data.get('password')
        role = data.get('role')

        if not email or not password or not role:
            raise serializers.ValidationError("Email, password, and role are required.")

        # Check if user exists
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid credentials.")

        # Check if user is active
        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated.")

        # Check if role matches
        if user.role != role:
            raise serializers.ValidationError("Invalid role for this user.")

        # Authenticate user
        user = authenticate(username=email, password=password)
        if not user:
            raise serializers.ValidationError("Invalid credentials.")

        data['user'] = user
        return data


class ClientSerializer(serializers.ModelSerializer):
    """Serializer for user details."""

    class Meta:
        model = User
        fields = ['id', 'full_name', 'email', 'phone_number', 'role', 'is_active', 'is_staff', 'is_superuser', 'created_at']
        read_only_fields = ['id', 'is_staff', 'is_superuser', 'created_at']
