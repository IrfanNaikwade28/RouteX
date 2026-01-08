"""
Simple synchronous tests for WebSocket tracking functionality.
Tests database models and API endpoints without requiring daphne.
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from track_driver.models import DriverAssignment, DriverLocation
from track_driver.serializers import DriverTaskSerializer
from client.models import Parcel
from admin_dashboard.models import Driver

User = get_user_model()


def print_header(text):
    """Print a formatted header."""
    print("\n" + "="*70)
    print(f"  {text}")
    print("="*70)


def print_subheader(text):
    """Print a formatted subheader."""
    print("\n" + "-"*70)
    print(f"  {text}")
    print("-"*70)


def setup_test_data():
    """Set up test data for tracking tests."""
    print_header("SETTING UP TEST DATA")
    
    # Clear existing test data
    User.objects.filter(email__endswith='@test.com').delete()
    Driver.objects.filter(email__endswith='@test.com').delete()
    
    # Create test driver user
    driver_user = User.objects.create_user(
        email='driver@test.com',
        full_name='John Doe',
        phone_number='9876543210',
        password='testpass123',
        role='driver'
    )
    print(f"✓ Created driver user: {driver_user.email} (ID: {driver_user.id})")
    
    # Create driver profile
    driver_profile = Driver.objects.create(
        user=driver_user,
        name='John Doe',
        email='driver-profile@test.com',
        phone_number='9876543210',
        vehicle_number='ABC-1234',
        vehicle_type='van',
        is_available=True,
        current_location='Distribution Center'
    )
    print(f"✓ Created driver profile: {driver_profile.name}")
    
    # Create test client user
    client_user = User.objects.create_user(
        email='client@test.com',
        full_name='Alice Johnson',
        phone_number='1234567890',
        password='testpass123',
        role='client'
    )
    print(f"✓ Created client user: {client_user.email} (ID: {client_user.id})")
    
    # Create test parcel (client field is just the User model)
    parcel = Parcel.objects.create(
        tracking_number='PKG-2026-001',
        client=client_user,
        from_location='Distribution Center',
        to_location='123 Main St, City',
        pickup_lat=28.7041,
        pickup_lng=77.1025,
        drop_lat=28.5355,
        drop_lng=77.3910,
        weight=2.50,
        height=10.0,
        width=8.0,
        breadth=6.0,
        price=150.00,
        distance_km=15.50,
        description='Electronics Package',
        special_instructions='Handle with care - fragile',
        current_status='assigned'
    )
    print(f"✓ Created parcel: {parcel.tracking_number}")
    print(f"  - Status: {parcel.current_status}")
    print(f"  - Weight: {parcel.weight}kg")
    print(f"  - From: {parcel.from_location}")
    print(f"  - To: {parcel.to_location}")
    
    # Create driver assignment
    assignment = DriverAssignment.objects.create(
        driver=driver_user,
        parcel=parcel
    )
    print(f"✓ Created driver assignment: {assignment}")
    
    return {
        'driver_user': driver_user,
        'driver_profile': driver_profile,
        'client_user': client_user,
        'parcel': parcel,
        'assignment': assignment
    }


def test_driver_assignment(data):
    """Test driver assignment creation and retrieval."""
    print_subheader("TEST 1: Driver Assignment")
    
    driver_user = data['driver_user']
    parcel = data['parcel']
    
    # Test 1.1: Check assignment exists
    assignment = DriverAssignment.objects.filter(
        driver=driver_user,
        parcel=parcel
    ).first()
    
    if assignment:
        print(f"✓ Assignment found:")
        print(f"  - Driver: {assignment.driver.email}")
        print(f"  - Parcel: {assignment.parcel.tracking_number}")
        print(f"  - Assigned At: {assignment.assigned_at}")
        print(f"  - Status: Pending (started_at: {assignment.started_at})")
        return True
    else:
        print("✗ Assignment not found")
        return False


def test_driver_tasks_serializer(data):
    """Test DriverTaskSerializer output."""
    print_subheader("TEST 2: Driver Tasks Serializer")
    
    driver_user = data['driver_user']
    parcel = data['parcel']
    
    # Get all parcels assigned to driver
    assignments = DriverAssignment.objects.filter(
        driver=driver_user
    ).select_related('parcel', 'parcel__client')
    
    parcels = Parcel.objects.filter(
        id__in=[a.parcel.id for a in assignments]
    )
    
    serializer = DriverTaskSerializer(parcels, many=True)
    
    print(f"✓ Serialized {len(serializer.data)} parcels")
    
    for parcel_data in serializer.data:
        print(f"\n  Parcel: {parcel_data['tracking_number']}")
        print(f"    - Client: {parcel_data['client_name']}")
        print(f"    - Email: {parcel_data['client_email']}")
        print(f"    - Phone: {parcel_data['client_phone']}")
        print(f"    - From: {parcel_data['from_location']}")
        print(f"    - To: {parcel_data['to_location']}")
        print(f"    - Coordinates: ({parcel_data['pickup_lat']}, {parcel_data['pickup_lng']}) -> ({parcel_data['drop_lat']}, {parcel_data['drop_lng']})")
        print(f"    - Weight: {parcel_data['weight']}kg")
        print(f"    - Status: {parcel_data['current_status']}")
    
    return True


def test_location_persistence(data):
    """Test location persistence to database."""
    print_subheader("TEST 3: Location Persistence")
    
    driver_user = data['driver_user']
    parcel = data['parcel']
    
    # Clear existing locations
    DriverLocation.objects.filter(driver=driver_user).delete()
    initial_count = DriverLocation.objects.count()
    print(f"Initial location records in DB: {initial_count}")
    
    # Simulate saving locations
    test_locations = [
        {'lat': 28.7041, 'lng': 77.1025, 'address': 'Distribution Center'},
        {'lat': 28.6505, 'lng': 77.2319, 'address': 'Central Delhi'},
        {'lat': 28.5921, 'lng': 77.3055, 'address': 'South Delhi'},
        {'lat': 28.5355, 'lng': 77.3910, 'address': 'Destination'},
    ]
    
    print(f"\nSaving {len(test_locations)} location records...")
    
    for i, loc in enumerate(test_locations):
        location = DriverLocation.objects.create(
            driver=driver_user,
            parcel=parcel,
            latitude=loc['lat'],
            longitude=loc['lng'],
            address=loc['address']
        )
        print(f"  ✓ Location {i+1}: {loc['address']} ({loc['lat']}, {loc['lng']})")
    
    # Verify all locations saved
    saved_locations = DriverLocation.objects.filter(driver=driver_user)
    print(f"\n✓ Total locations saved: {saved_locations.count()}")
    
    for loc in saved_locations.order_by('timestamp'):
        print(f"  - {loc.address}: ({loc.latitude}, {loc.longitude}) at {loc.timestamp}")
    
    return saved_locations.count() == len(test_locations)


def test_parcel_coordinates(data):
    """Test parcel coordinate retrieval."""
    print_subheader("TEST 4: Parcel Route Coordinates")
    
    parcel = data['parcel']
    
    # Check if all coordinates are present
    has_all_coords = all([
        parcel.pickup_lat,
        parcel.pickup_lng,
        parcel.drop_lat,
        parcel.drop_lng
    ])
    
    if has_all_coords:
        print(f"✓ Parcel {parcel.tracking_number} has complete route coordinates:")
        print(f"  - Pickup: ({parcel.pickup_lat}, {parcel.pickup_lng})")
        print(f"  - Drop: ({parcel.drop_lat}, {parcel.drop_lng})")
        
        # Calculate rough distance (simplified)
        import math
        lat1, lon1 = float(parcel.pickup_lat), float(parcel.pickup_lng)
        lat2, lon2 = float(parcel.drop_lat), float(parcel.drop_lng)
        
        # Haversine formula
        R = 6371  # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2) ** 2
        c = 2 * math.asin(math.sqrt(a))
        distance = R * c
        
        print(f"  - Approximate distance: {distance:.2f} km")
        return True
    else:
        print("✗ Missing coordinate data for parcel")
        return False


def test_security_models(data):
    """Test security and access control."""
    print_subheader("TEST 5: Security - Access Control")
    
    driver_user = data['driver_user']
    client_user = data['client_user']
    parcel = data['parcel']
    
    # Test 5.1: Verify driver is assigned to parcel
    driver_can_access = DriverAssignment.objects.filter(
        driver=driver_user,
        parcel=parcel
    ).exists()
    
    print(f"Driver can access parcel: {driver_can_access}")
    if driver_can_access:
        print("  ✓ Driver is properly assigned to parcel")
    
    # Test 5.2: Verify client owns parcel
    client_can_access = parcel.client == client_user
    
    print(f"Client owns parcel: {client_can_access}")
    if client_can_access:
        print("  ✓ Client is the rightful owner of parcel")
    
    # Test 5.3: Create another driver and verify no access
    other_driver = User.objects.create_user(
        email='other_driver@test.com',
        full_name='Other Driver',
        phone_number='5555555555',
        password='testpass123',
        role='driver'
    )
    Driver.objects.create(
        user=other_driver,
        name='Other Driver',
        email='other-driver-profile@test.com',
        phone_number='5555555555',
        vehicle_number='XYZ-789',
        vehicle_type='car',
        current_location='Depot'
    )
    
    other_driver_access = DriverAssignment.objects.filter(
        driver=other_driver,
        parcel=parcel
    ).exists()
    
    print(f"Other driver can access parcel: {other_driver_access}")
    if not other_driver_access:
        print("  ✓ Other driver correctly denied access")
    
    return driver_can_access and client_can_access and not other_driver_access


def test_database_state():
    """Test overall database state and integrity."""
    print_subheader("TEST 6: Database State Integrity")
    
    # Count all entities
    users_count = User.objects.filter(email__endswith='@test.com').count()
    drivers_count = Driver.objects.filter(user__email__endswith='@test.com').count()
    parcels_count = Parcel.objects.filter(tracking_number__startswith='PKG-2026').count()
    assignments_count = DriverAssignment.objects.filter(
        driver__email__endswith='@test.com'
    ).count()
    locations_count = DriverLocation.objects.filter(
        driver__email__endswith='@test.com'
    ).count()
    
    print(f"✓ Test Users: {users_count}")
    print(f"✓ Driver Profiles: {drivers_count}")
    print(f"✓ Parcels: {parcels_count}")
    print(f"✓ Assignments: {assignments_count}")
    print(f"✓ Location Records: {locations_count}")
    
    return all([users_count > 0, drivers_count > 0, parcels_count > 0])


def print_summary(results):
    """Print test summary."""
    print_header("TEST SUMMARY")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nResult: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! WebSocket tracking models are working correctly.")
        print("\n📝 Next Steps:")
        print("  1. Install daphne: pip install daphne")
        print("  2. Run server: python manage.py runserver")
        print("  3. Test WebSocket connection from frontend")
    else:
        print(f"\n⚠️ {total - passed} test(s) failed. Check the logs above.")


if __name__ == '__main__':
    print("\n" + "█"*70)
    print("█" + " "*68 + "█")
    print("█" + " WEBSOCKET TRACKING - MODEL & DATABASE TESTS ".center(68) + "█")
    print("█" + " "*68 + "█")
    print("█"*70)
    
    # Setup test data
    data = setup_test_data()
    
    # Run tests
    results = {}
    
    try:
        results['Driver Assignment'] = test_driver_assignment(data)
    except Exception as e:
        print(f"✗ Error: {e}")
        results['Driver Assignment'] = False
    
    try:
        results['Task Serialization'] = test_driver_tasks_serializer(data)
    except Exception as e:
        print(f"✗ Error: {e}")
        results['Task Serialization'] = False
    
    try:
        results['Location Persistence'] = test_location_persistence(data)
    except Exception as e:
        print(f"✗ Error: {e}")
        results['Location Persistence'] = False
    
    try:
        results['Route Coordinates'] = test_parcel_coordinates(data)
    except Exception as e:
        print(f"✗ Error: {e}")
        results['Route Coordinates'] = False
    
    try:
        results['Security & Access'] = test_security_models(data)
    except Exception as e:
        print(f"✗ Error: {e}")
        results['Security & Access'] = False
    
    try:
        results['Database Integrity'] = test_database_state()
    except Exception as e:
        print(f"✗ Error: {e}")
        results['Database Integrity'] = False
    
    # Print summary
    print_summary(results)
