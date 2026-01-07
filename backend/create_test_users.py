"""
Quick script to create test users for RouteX application
Run with: python create_test_users.py
"""

import django
import os
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from authapp.models import User


def create_test_users():
    """Create test users for each role."""
    
    print("Creating test users...\n")
    
    # Create Admin User
    try:
        admin, created = User.objects.get_or_create(
            email='admin@routex.com',
            defaults={
                'full_name': 'Admin User',
                'phone_number': '+1234567890',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            admin.set_password('admin123')
            admin.save()
            print("✅ Admin user created:")
            print(f"   Email: admin@routex.com")
            print(f"   Password: admin123")
            print(f"   Role: admin\n")
        else:
            print("ℹ️  Admin user already exists (admin@routex.com)\n")
    except Exception as e:
        print(f"❌ Error creating admin: {e}\n")
    
    # Create Driver User
    try:
        driver, created = User.objects.get_or_create(
            email='driver@routex.com',
            defaults={
                'full_name': 'Driver User',
                'phone_number': '+1234567891',
                'role': 'driver',
            }
        )
        if created:
            driver.set_password('driver123')
            driver.save()
            print("✅ Driver user created:")
            print(f"   Email: driver@routex.com")
            print(f"   Password: driver123")
            print(f"   Role: driver\n")
        else:
            print("ℹ️  Driver user already exists (driver@routex.com)\n")
    except Exception as e:
        print(f"❌ Error creating driver: {e}\n")
    
    # Create Client User
    try:
        client, created = User.objects.get_or_create(
            email='client@routex.com',
            defaults={
                'full_name': 'Client User',
                'phone_number': '+1234567892',
                'role': 'client',
            }
        )
        if created:
            client.set_password('client123')
            client.save()
            print("✅ Client user created:")
            print(f"   Email: client@routex.com")
            print(f"   Password: client123")
            print(f"   Role: client\n")
        else:
            print("ℹ️  Client user already exists (client@routex.com)\n")
    except Exception as e:
        print(f"❌ Error creating client: {e}\n")
    
    print("\n" + "="*50)
    print("Test Users Summary:")
    print("="*50)
    print("\n1. Admin Account:")
    print("   URL: http://localhost:5173/auth")
    print("   Email: admin@routex.com")
    print("   Password: admin123")
    print("   Role: Admin")
    
    print("\n2. Driver Account:")
    print("   URL: http://localhost:5173/auth")
    print("   Email: driver@routex.com")
    print("   Password: driver123")
    print("   Role: Driver")
    
    print("\n3. Client Account:")
    print("   URL: http://localhost:5173/auth")
    print("   Email: client@routex.com")
    print("   Password: client123")
    print("   Role: Client")
    print("\n" + "="*50 + "\n")


if __name__ == '__main__':
    create_test_users()
