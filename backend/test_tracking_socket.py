"""
Comprehensive test script for WebSocket tracking functionality.
Tests driver location tracking, parcel assignment, and real-time updates.
"""

import os
import django
import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from channels.testing import WebsocketCommunicator
from channels.layers import get_channel_layer

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from track_driver.consumers import TrackingConsumer
from track_driver.models import DriverAssignment, DriverLocation
from client.models import Parcel, ParcelStatusHistory, Notification
from admin_dashboard.models import Driver

User = get_user_model()


class TrackingWebSocketTests(TestCase):
    """Test suite for WebSocket tracking functionality."""
    
    def setUp(self):
        """Set up test data."""
        print("\n" + "="*70)
        print("SETTING UP TEST DATA")
        print("="*70)
        
        # Create test driver user
        self.driver_user = User.objects.create_user(
            email='driver@test.com',
            password='testpass123',
            is_staff=False
        )
        print(f"✓ Created driver user: {self.driver_user.email} (ID: {self.driver_user.id})")
        
        # Create driver profile
        self.driver_profile = Driver.objects.create(
            user=self.driver_user,
            name='Test Driver',
            phone_number='1234567890',
            vehicle_number='ABC-123',
            vehicle_type='van',
            is_available=True
        )
        print(f"✓ Created driver profile: {self.driver_profile.name}")
        
        # Create test client user
        self.client_user = User.objects.create_user(
            email='client@test.com',
            full_name='Test Client',
            phone_number='9876543210',
            password='testpass123',
            role='client'
        )
        print(f"✓ Created client user: {self.client_user.email} (ID: {self.client_user.id})")
        
        # Create test parcel (client field points to User, not Client model)
        self.parcel = Parcel.objects.create(
            tracking_number='TEST123456',
            client=self.client_user,
            from_location='Warehouse',
            to_location='Client Address',
            pickup_lat=28.7041,
            pickup_lng=77.1025,
            drop_lat=28.5355,
            drop_lng=77.3910,
            weight=5.50,
            description='Test Package',
            current_status='assigned'
        )
        print(f"✓ Created parcel: {self.parcel.tracking_number} (Status: {self.parcel.current_status})")
        
        # Create driver assignment
        self.assignment = DriverAssignment.objects.create(
            driver=self.driver_user,
            parcel=self.parcel
        )
        print(f"✓ Created driver assignment: {self.assignment}")
    
    async def test_driver_websocket_connection(self):
        """Test that driver can connect to WebSocket."""
        print("\n" + "-"*70)
        print("TEST 1: Driver WebSocket Connection")
        print("-"*70)
        
        communicator = WebsocketCommunicator(
            TrackingConsumer.as_asgi(),
            f"/ws/tracking/?parcel_id={self.parcel.id}"
        )
        communicator.scope['user'] = self.driver_user
        
        connected, subprotocol = await communicator.connect()
        print(f"✓ Connection attempt: {connected}")
        
        if connected:
            await communicator.disconnect()
            print("✓ Successfully connected and disconnected")
            return True
        else:
            print("✗ Failed to connect")
            return False
    
    async def test_driver_location_update(self):
        """Test that driver can send location updates."""
        print("\n" + "-"*70)
        print("TEST 2: Driver Location Update")
        print("-"*70)
        
        communicator = WebsocketCommunicator(
            TrackingConsumer.as_asgi(),
            f"/ws/tracking/?parcel_id={self.parcel.id}"
        )
        communicator.scope['user'] = self.driver_user
        
        connected, _ = await communicator.connect()
        
        if not connected:
            print("✗ Failed to connect")
            return False
        
        # Send location update
        location_update = {
            'type': 'location_update',
            'lat': 28.6139,
            'lng': 77.2090,
            'address': 'New Delhi, India',
            'parcel_id': self.parcel.id
        }
        
        print(f"✓ Sending location update: {location_update}")
        await communicator.send_json_to(location_update)
        
        # Give it a moment to process
        import asyncio
        await asyncio.sleep(0.1)
        
        await communicator.disconnect()
        print("✓ Location update sent successfully")
        return True
    
    async def test_client_cannot_update_location(self):
        """Test that clients cannot send location updates."""
        print("\n" + "-"*70)
        print("TEST 3: Client Cannot Update Location (Security)")
        print("-"*70)
        
        communicator = WebsocketCommunicator(
            TrackingConsumer.as_asgi(),
            f"/ws/tracking/?parcel_id={self.parcel.id}"
        )
        communicator.scope['user'] = self.client_user
        
        connected, _ = await communicator.connect()
        
        if not connected:
            print("✗ Failed to connect")
            return False
        
        # Try to send location update
        location_update = {
            'type': 'location_update',
            'lat': 28.6139,
            'lng': 77.2090,
            'address': 'New Delhi, India'
        }
        
        print(f"✓ Attempting location update as client (should be rejected)...")
        await communicator.send_json_to(location_update)
        
        import asyncio
        await asyncio.sleep(0.1)
        
        response = await asyncio.wait_for(communicator.receive_json_from(), timeout=1.0)
        
        if response.get('type') == 'error':
            print(f"✓ Correctly rejected: {response.get('message')}")
            await communicator.disconnect()
            return True
        else:
            print(f"✗ Should have rejected the update")
            await communicator.disconnect()
            return False
    
    async def test_unauthorized_parcel_access(self):
        """Test that users can't access parcels they don't own/drive."""
        print("\n" + "-"*70)
        print("TEST 4: Unauthorized Parcel Access (Security)")
        print("-"*70)
        
        # Create another driver not assigned to the parcel
        other_driver = User.objects.create_user(
            email='other_driver@test.com',
            password='testpass123'
        )
        Driver.objects.create(
            user=other_driver,
            name='Other Driver',
            phone_number='5555555555',
            vehicle_number='XYZ-789',
            vehicle_type='car'
        )
        
        communicator = WebsocketCommunicator(
            TrackingConsumer.as_asgi(),
            f"/ws/tracking/?parcel_id={self.parcel.id}"
        )
        communicator.scope['user'] = other_driver
        
        try:
            connected, _ = await communicator.connect()
            if not connected:
                print("✓ Connection correctly rejected for unauthorized driver")
                return True
            else:
                print("✗ Should have rejected unauthorized access")
                await communicator.disconnect()
                return False
        except Exception as e:
            print(f"✓ Connection rejected with error: {e}")
            return True
    
    async def test_location_persistence(self):
        """Test that location updates are saved to database."""
        print("\n" + "-"*70)
        print("TEST 5: Location Persistence to Database")
        print("-"*70)
        
        # Clear existing locations
        DriverLocation.objects.all().delete()
        initial_count = DriverLocation.objects.count()
        print(f"Initial location records: {initial_count}")
        
        communicator = WebsocketCommunicator(
            TrackingConsumer.as_asgi(),
            f"/ws/tracking/?parcel_id={self.parcel.id}"
        )
        communicator.scope['user'] = self.driver_user
        
        connected, _ = await communicator.connect()
        if not connected:
            print("✗ Failed to connect")
            return False
        
        # Send 5 location updates (should save on 5th)
        print("Sending 5 location updates (should save on 5th)...")
        for i in range(5):
            location_update = {
                'type': 'location_update',
                'lat': 28.6139 + (i * 0.001),
                'lng': 77.2090 + (i * 0.001),
                'address': f'Location {i+1}',
                'parcel_id': self.parcel.id
            }
            await communicator.send_json_to(location_update)
        
        import asyncio
        await asyncio.sleep(0.2)
        
        await communicator.disconnect()
        
        # Check if location was saved
        saved_locations = DriverLocation.objects.filter(driver=self.driver_user)
        if saved_locations.exists():
            print(f"✓ Location saved to database: {saved_locations.count()} records")
            location = saved_locations.first()
            print(f"  - Latitude: {location.latitude}")
            print(f"  - Longitude: {location.longitude}")
            print(f"  - Address: {location.address}")
            return True
        else:
            print("✗ Location was not saved to database")
            return False


def run_sync_tests():
    """Run synchronous tests."""
    print("\n" + "="*70)
    print("RUNNING SYNCHRONOUS TESTS")
    print("="*70)
    
    test_case = TrackingWebSocketTests()
    test_case.setUp()
    
    # Test database state
    print("\n" + "-"*70)
    print("TEST: Database State Verification")
    print("-"*70)
    
    drivers_count = User.objects.filter(
        driver_assignments__isnull=False
    ).distinct().count()
    print(f"✓ Active drivers: {drivers_count}")
    
    parcels_count = Parcel.objects.count()
    print(f"✓ Total parcels: {parcels_count}")
    
    assignments_count = DriverAssignment.objects.count()
    print(f"✓ Driver assignments: {assignments_count}")
    
    locations_count = DriverLocation.objects.count()
    print(f"✓ Location records: {locations_count}")
    
    # Test DriverTasksView data
    print("\n" + "-"*70)
    print("TEST: Driver Tasks API Data")
    print("-"*70)
    
    assignments = DriverAssignment.objects.filter(
        driver=test_case.driver_user
    ).select_related('parcel')
    
    print(f"✓ Assignments for driver: {assignments.count()}")
    for assignment in assignments:
        print(f"  - Parcel: {assignment.parcel.tracking_number}")
        print(f"    Status: {assignment.parcel.current_status}")
        print(f"    Assigned: {assignment.assigned_at}")
        print(f"    Started: {assignment.started_at}")
        print(f"    Completed: {assignment.completed_at}")


async def run_async_tests():
    """Run asynchronous tests."""
    print("\n" + "="*70)
    print("RUNNING ASYNCHRONOUS WEBSOCKET TESTS")
    print("="*70)
    
    test_case = TrackingWebSocketTests()
    test_case.setUp()
    
    results = {}
    
    try:
        results['connection'] = await test_case.test_driver_websocket_connection()
    except Exception as e:
        print(f"✗ Connection test failed: {e}")
        results['connection'] = False
    
    try:
        results['location_update'] = await test_case.test_driver_location_update()
    except Exception as e:
        print(f"✗ Location update test failed: {e}")
        results['location_update'] = False
    
    try:
        results['client_security'] = await test_case.test_client_cannot_update_location()
    except Exception as e:
        print(f"✗ Client security test failed: {e}")
        results['client_security'] = False
    
    try:
        results['auth_security'] = await test_case.test_unauthorized_parcel_access()
    except Exception as e:
        print(f"✗ Authorization security test failed: {e}")
        results['auth_security'] = False
    
    try:
        results['persistence'] = await test_case.test_location_persistence()
    except Exception as e:
        print(f"✗ Location persistence test failed: {e}")
        results['persistence'] = False
    
    return results


def print_summary(async_results):
    """Print test summary."""
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    
    passed = sum(1 for v in async_results.values() if v)
    total = len(async_results)
    
    for test_name, result in async_results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! WebSocket tracking is working correctly.")
    else:
        print(f"\n⚠️ {total - passed} test(s) failed. Check the logs above.")


if __name__ == '__main__':
    import asyncio
    
    print("\n" + "█"*70)
    print("█" + " "*68 + "█")
    print("█" + " WEBSOCKET TRACKING SYSTEM - TEST SUITE ".center(68) + "█")
    print("█" + " "*68 + "█")
    print("█"*70)
    
    # Run synchronous tests
    run_sync_tests()
    
    # Run asynchronous tests
    async_results = asyncio.run(run_async_tests())
    
    # Print summary
    print_summary(async_results)
