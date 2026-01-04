# Track Driver App - Setup Instructions

## Overview
The `track_driver` app provides real-time driver tracking functionality using Django Channels WebSockets. It replaces the frontend DummySocketService with a real backend implementation.

## Installation

### 1. Install Dependencies
```bash
pip install channels channels-redis
```

### 2. Database Migrations
Run migrations to create the new tables:
```bash
python manage.py migrate track_driver
python manage.py migrate client
```

## Configuration

### Settings (Already Configured)
- `track_driver` app added to `INSTALLED_APPS`
- `channels` added to `INSTALLED_APPS`
- `ASGI_APPLICATION` set to `config.asgi.application`
- `CHANNEL_LAYERS` configured with InMemoryChannelLayer (for development)

### For Production
For production, use Redis as the channel layer:
```python
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('127.0.0.1', 6379)],
        },
    },
}
```

## API Endpoints

### 1. Get Driver Tasks
**GET** `/api/driver/tasks/`
- Returns all parcels with status='accepted' assigned to the logged-in driver
- Requires JWT authentication
- Response: List of parcels with client info and coordinates

### 2. Update Parcel Status
**PATCH** `/api/driver/parcel/<id>/update-status/`
- Allows drivers to change status to 'in_transit' or 'delivered'
- Requires JWT authentication
- Body: `{"current_status": "in_transit"}` or `{"current_status": "delivered"}`

### 3. Get Route Coordinates
**GET** `/api/driver/route/<parcel_id>/`
- Returns pickup and drop coordinates for Leaflet Routing Machine
- Requires JWT authentication
- Response: `{pickup_lat, pickup_lng, drop_lat, drop_lng, from_location, to_location}`

## WebSocket Connection

### Connection URL
```
ws://localhost:8000/ws/tracking/?token=<JWT_ACCESS_TOKEN>&parcel_id=<parcel_id>
```

### Authentication
- JWT token must be passed as a query parameter: `?token=<access_token>`
- Token is validated using `rest_framework_simplejwt`
- Unauthenticated connections are rejected

### Message Types

#### 1. Location Update (Driver → Server)
Send location updates from the driver app:
```json
{
  "type": "location_update",
  "lat": 40.7128,
  "lng": -74.0060,
  "address": "123 Main St, New York",
  "parcel_id": 1
}
```

#### 2. Subscribe to Parcel
Subscribe to location updates for a specific parcel:
```json
{
  "type": "subscribe_parcel",
  "parcel_id": 1
}
```

#### 3. Unsubscribe from Parcel
Unsubscribe from location updates:
```json
{
  "type": "unsubscribe_parcel",
  "parcel_id": 1
}
```

### Server Messages

#### Location Update Broadcast
All subscribers receive location updates:
```json
{
  "type": "location_update",
  "driver_id": "1",
  "location": {
    "lat": 40.7128,
    "lng": -74.0060,
    "address": "123 Main St, New York"
  },
  "parcel_id": 1
}
```

## Data Models

### DriverAssignment
Links a Parcel to a Driver (User):
- `parcel`: OneToOneField to Parcel
- `driver`: ForeignKey to User
- `assigned_at`: DateTime
- `started_at`: DateTime (set when status becomes 'in_transit')
- `completed_at`: DateTime (set when status becomes 'delivered')

### DriverLocation
Stores driver location history:
- `driver`: ForeignKey to User
- `parcel`: ForeignKey to Parcel (optional)
- `latitude`: DecimalField
- `longitude`: DecimalField
- `address`: CharField
- `timestamp`: DateTime

## WebSocket Groups

### Driver Group
- Group name: `driver_{driver_id}`
- Used for driver-specific updates
- Automatically joined on connection

### Parcel Group
- Group name: `parcel_{parcel_id}`
- Used for broadcasting location updates to clients/admins tracking that parcel
- Joined when `parcel_id` is provided in connection or via subscribe message

## Location Persistence

- Location updates are saved to the database every 5th update to reduce database overhead
- All updates are broadcast in real-time via WebSocket
- Location history is stored in the `DriverLocation` model

## Frontend Integration

The WebSocket payload matches the frontend `Location` type:
```typescript
{
  lat: number;
  lng: number;
  address: string;
}
```

### Example Frontend Connection
```typescript
const token = localStorage.getItem('accessToken');
const ws = new WebSocket(`ws://localhost:8000/ws/tracking/?token=${token}&parcel_id=1`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'location_update') {
    // Update map with driver location
    updateDriverMarker(data.location);
  }
};

// Send location update
ws.send(JSON.stringify({
  type: 'location_update',
  lat: 40.7128,
  lng: -74.0060,
  address: 'Current location',
  parcel_id: 1
}));
```

## Running the Server

### Development
```bash
python manage.py runserver
```

### Production (with ASGI)
For production, use an ASGI server like Daphne:
```bash
pip install daphne
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

## Notes

- The Parcel model now includes `pickup_lat`, `pickup_lng`, `drop_lat`, `drop_lng` fields
- Parcel status choices now include: 'requested', 'accepted', 'in_transit', 'delivered'
- Driver assignments are created when a parcel is assigned to a driver
- Status updates automatically create ParcelStatusHistory entries


