#!/usr/bin/env python
"""Test script for role-based authentication."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from authapp.models import User

# Create a test admin user
admin_user = User.objects.create_user(
    email='admin@test.com',
    full_name='Admin User',
    phone_number='9876543210',
    password='adminpass123',
    role='admin'
)

print(f"✓ Created Admin User:")
print(f"  Email: {admin_user.email}")
print(f"  Role: {admin_user.role}")
print(f"  is_staff: {admin_user.is_staff}")
print(f"  is_superuser: {admin_user.is_superuser}")

# Create a test client user
client_user = User.objects.create_user(
    email='client@test.com',
    full_name='Client User',
    phone_number='9876543211',
    password='clientpass123',
    role='client'
)

print(f"\n✓ Created Client User:")
print(f"  Email: {client_user.email}")
print(f"  Role: {client_user.role}")
print(f"  is_staff: {client_user.is_staff}")
print(f"  is_superuser: {client_user.is_superuser}")

# Create a test driver user
driver_user = User.objects.create_user(
    email='driver@test.com',
    full_name='Driver User',
    phone_number='9876543212',
    password='driverpass123',
    role='driver'
)

print(f"\n✓ Created Driver User:")
print(f"  Email: {driver_user.email}")
print(f"  Role: {driver_user.role}")
print(f"  is_staff: {driver_user.is_staff}")
print(f"  is_superuser: {driver_user.is_superuser}")

print("\n✓ All users created successfully!")
