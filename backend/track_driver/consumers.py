import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import DriverLocation, DriverAssignment
from client.models import Parcel

User = get_user_model()


class TrackingConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time driver tracking."""
    
    async def connect(self):
        """Handle WebSocket connection."""
        self.user = self.scope.get('user')
        
        # Check if user is authenticated
        if not self.user or not self.user.is_authenticated:
            print("[DEBUG] WebSocket connection rejected: User not authenticated")
            await self.close()
            return
        
        print(f"[DEBUG] WebSocket connection from user: {self.user.email} (ID: {self.user.id})")
        
        # Get driver_id and parcel_id from query parameters
        query_string = self.scope.get('query_string', b'').decode()
        params = dict(param.split('=') for param in query_string.split('&') if '=' in param)
        
        self.user_id = str(self.user.id)
        self.parcel_id = params.get('parcel_id', None)
        
        # Check if user is a driver (has driver assignments) or client (owns parcels)
        is_driver = await self.is_driver(self.user.id)
        
        if is_driver:
            # Join driver group for location updates
            self.driver_group_name = f'driver_{self.user_id}'
            await self.channel_layer.group_add(
                self.driver_group_name,
                self.channel_name
            )
            self.driver_id = self.user_id
        else:
            # Client tracking mode - only subscribe to parcels
            self.driver_id = None
        
        # Join parcel group if parcel_id is provided (for both drivers and clients)
        if self.parcel_id:
            # Verify access: driver must be assigned, client must own the parcel
            has_access = await self.verify_parcel_access(self.user.id, self.parcel_id, is_driver)
            if has_access:
                self.parcel_group_name = f'parcel_{self.parcel_id}'
                await self.channel_layer.group_add(
                    self.parcel_group_name,
                    self.channel_name
                )
            else:
                await self.close()
                return
        
        # Track update count for persistence (save every 5th update)
        self.update_count = 0
        
        await self.accept()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        print(f"[DEBUG] WebSocket disconnection from {self.user.email if hasattr(self, 'user') else 'unknown user'} (code: {close_code})")
        
        # Leave driver group if driver
        if hasattr(self, 'driver_group_name'):
            await self.channel_layer.group_discard(
                self.driver_group_name,
                self.channel_name
            )
        
        # Leave parcel group if it exists
        if hasattr(self, 'parcel_group_name'):
            await self.channel_layer.group_discard(
                self.parcel_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type', 'location_update')
            
            # Only drivers can send location updates
            if message_type == 'location_update':
                if not hasattr(self, 'driver_id') or not self.driver_id:
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': 'Only drivers can send location updates'
                    }))
                    return
                await self.handle_location_update(data)
            elif message_type == 'subscribe_parcel':
                await self.handle_subscribe_parcel(data)
            elif message_type == 'unsubscribe_parcel':
                await self.handle_unsubscribe_parcel(data)
        except json.JSONDecodeError as e:
            print(f"[ERROR] JSON decode error from {self.user.email}: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            print(f"[ERROR] Unexpected error in receive() from {self.user.email}: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': str(e)
            }))
    
    async def handle_location_update(self, data):
        """Handle location update from driver."""
        lat = data.get('lat')
        lng = data.get('lng')
        address = data.get('address', '')
        parcel_id = data.get('parcel_id', self.parcel_id)
        
        if not lat or not lng:
            print(f"[ERROR] Invalid location update - missing lat/lng from {self.user.email}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Latitude and longitude are required'
            }))
            return
        
        print(f"[DEBUG] Location update from {self.user.email}: lat={lat}, lng={lng}, parcel_id={parcel_id}, update_count={self.update_count + 1}")
        
        # Increment update count
        self.update_count += 1
        
        # Create location payload matching frontend Location type
        location_payload = {
            'lat': float(lat),
            'lng': float(lng),
            'address': address
        }
        
        # Save to database every 5th update
        if self.update_count % 5 == 0:
            await self.save_location_to_db(
                self.user.id,
                parcel_id,
                lat,
                lng,
                address
            )
        
        # Get all parcels assigned to this driver for broadcasting
        assigned_parcels = await self.get_assigned_parcels(self.user.id)
        
        # Broadcast to parcel groups for all assigned parcels
        for p_id in assigned_parcels:
            await self.channel_layer.group_send(
                f'parcel_{p_id}',
                {
                    'type': 'location_update',
                    'driver_id': self.user_id,
                    'location': location_payload,
                    'parcel_id': p_id
                }
            )
        
        # If specific parcel_id provided, also broadcast to that group
        if parcel_id and str(parcel_id) not in [str(p) for p in assigned_parcels]:
            await self.channel_layer.group_send(
                f'parcel_{parcel_id}',
                {
                    'type': 'location_update',
                    'driver_id': self.user_id,
                    'location': location_payload,
                    'parcel_id': parcel_id
                }
            )
        
        # Also send to driver group (for driver's own updates)
        if hasattr(self, 'driver_group_name'):
            await self.channel_layer.group_send(
                self.driver_group_name,
                {
                    'type': 'location_update',
                    'driver_id': self.user_id,
                    'location': location_payload,
                    'parcel_id': parcel_id
                }
            )
    
    @database_sync_to_async
    def get_assigned_parcels(self, driver_id):
        """Get all parcel IDs assigned to this driver."""
        try:
            assignments = DriverAssignment.objects.filter(
                driver_id=driver_id,
                parcel__current_status__in=['assigned', 'picked_up', 'in_transit', 'out_for_delivery']
            ).values_list('parcel_id', flat=True)
            return list(assignments)
        except Exception as e:
            print(f"Error getting assigned parcels: {e}")
            return []
    
    async def handle_subscribe_parcel(self, data):
        """Handle subscription to a parcel's location updates."""
        parcel_id = data.get('parcel_id')
        if parcel_id:
            # Verify access before subscribing
            is_driver = hasattr(self, 'driver_id') and self.driver_id is not None
            has_access = await self.verify_parcel_access(self.user.id, parcel_id, is_driver)
            
            if not has_access:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'You do not have access to track this parcel'
                }))
                return
            
            parcel_group_name = f'parcel_{parcel_id}'
            await self.channel_layer.group_add(
                parcel_group_name,
                self.channel_name
            )
            if not hasattr(self, 'parcel_group_name'):
                self.parcel_group_name = parcel_group_name
            await self.send(text_data=json.dumps({
                'type': 'subscribed',
                'parcel_id': parcel_id
            }))
    
    async def handle_unsubscribe_parcel(self, data):
        """Handle unsubscription from a parcel's location updates."""
        parcel_id = data.get('parcel_id')
        if parcel_id:
            parcel_group_name = f'parcel_{parcel_id}'
            await self.channel_layer.group_discard(
                parcel_group_name,
                self.channel_name
            )
            await self.send(text_data=json.dumps({
                'type': 'unsubscribed',
                'parcel_id': parcel_id
            }))
    
    async def location_update(self, event):
        """Send location update to WebSocket."""
        await self.send(text_data=json.dumps({
            'type': 'location_update',
            'driver_id': event['driver_id'],
            'location': event['location'],
            'parcel_id': event.get('parcel_id')
        }))
    
    @database_sync_to_async
    def is_driver(self, user_id):
        """Check if user is a driver (has driver assignments)."""
        try:
            return DriverAssignment.objects.filter(driver_id=user_id).exists()
        except Exception:
            return False
    
    @database_sync_to_async
    def verify_parcel_access(self, user_id, parcel_id, is_driver):
        """Verify user has access to track this parcel."""
        try:
            parcel = Parcel.objects.get(id=parcel_id)
            if is_driver:
                # Driver must be assigned to this parcel
                return DriverAssignment.objects.filter(
                    driver_id=user_id,
                    parcel_id=parcel_id
                ).exists()
            else:
                # Client must own this parcel
                return parcel.client_id == user_id
        except Parcel.DoesNotExist:
            return False
    
    @database_sync_to_async
    def save_location_to_db(self, driver_id, parcel_id, lat, lng, address):
        """Save driver location to database."""
        try:
            driver = User.objects.get(id=driver_id)
            parcel = None
            if parcel_id:
                try:
                    parcel = Parcel.objects.get(id=parcel_id)
                except Parcel.DoesNotExist:
                    pass
            
            DriverLocation.objects.create(
                driver=driver,
                parcel=parcel,
                latitude=lat,
                longitude=lng,
                address=address or ''
            )
        except Exception as e:
            # Log error but don't break the WebSocket connection
            print(f"Error saving location to DB: {e}")

