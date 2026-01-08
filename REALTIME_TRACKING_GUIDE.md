# WebSocket Realtime Tracking Implementation

## Overview

This document describes the implementation of realtime driver tracking using WebSocket connections between the frontend React application and Django Channels backend.

## Architecture

### Backend (Django Channels)
- **Consumer**: `TrackingConsumer` in `backend/track_driver/consumers.py`
- **WebSocket URL**: `/ws/tracking/?parcel_id=<ID>&token=<JWT>`
- **Authentication**: JWT-based via query parameter
- **Message Protocol**: JSON-based messages for location updates

### Frontend (React)
- **Custom Hook**: `useTrackingSocket` in `frontend/src/hooks/useTrackingSocket.ts`
- **Type Definitions**: `frontend/src/types/tracking.ts`
- **Components**:
  - `TrackParcel.tsx` - Client read-only tracking view
  - `DriverNavigation.tsx` - Driver location sending view

## Message Protocol

### Driver → Server (Location Update)
```json
{
  "type": "location_update",
  "lat": 28.6139,
  "lng": 77.2090,
  "address": "New Delhi, India",
  "parcel_id": 12
}
```

### Server → Clients (Broadcast)
```json
{
  "type": "location_update",
  "driver_id": "5",
  "location": {
    "lat": 28.6139,
    "lng": 77.2090,
    "address": "New Delhi, India"
  },
  "parcel_id": 12
}
```

### Error Message
```json
{
  "type": "error",
  "message": "Error description"
}
```

## Security & Access Control

### Role-based Permissions
| Role | Can Connect | Can Send Location | Can Receive Updates |
|------|-------------|-------------------|---------------------|
| Driver (assigned) | ✅ | ✅ | ✅ |
| Client (owner) | ✅ | ❌ | ✅ |
| Other Driver | ❌ | ❌ | ❌ |

### Backend Verification
- JWT token validation via middleware
- Parcel ownership check for clients
- Driver assignment verification
- All checks performed server-side

## Frontend Implementation

### useTrackingSocket Hook

**Location**: `frontend/src/hooks/useTrackingSocket.ts`

**Features**:
- Automatic connection management
- JWT authentication via query parameter
- Reconnection logic (max 5 attempts, 3s delay)
- Clean lifecycle management
- TypeScript type safety

**Usage**:
```typescript
const { 
  connectionState, 
  driverLocation, 
  sendLocationUpdate,
  connect,
  disconnect 
} = useTrackingSocket({
  parcelId: 123,
  autoConnect: true,
  onLocationUpdate: (location, driverId) => {
    console.log('Driver location:', location);
  },
  onError: (error) => {
    console.error('Error:', error);
  },
  onConnectionChange: (state) => {
    console.log('Connection state:', state);
  }
});
```

### Client View (TrackParcel.tsx)

**Features**:
- Read-only tracking
- Live driver marker on map
- Connection status indicator
- Automatic reconnection
- Location update notifications

**Behavior**:
- Connects when parcel is selected
- Receives live driver location updates
- Updates map marker smoothly
- Shows connection status (Live/Connecting/Offline/Error)
- Displays location update timestamp

### Driver View (DriverNavigation.tsx)

**Features**:
- Manual tracking toggle
- Periodic location updates (every 5 seconds)
- Uses device GPS
- Connection status indicator
- Automatic location sending

**Behavior**:
- Driver must enable tracking manually
- Uses `navigator.geolocation` API
- Sends location every 5 seconds when enabled
- Shows tracking status (On/Off)
- Connection indicator (Live/Connecting/Error)

## Map Integration

### Marker Types
- **Pickup**: Blue location dot
- **Destination**: Red flag
- **Driver**: Green truck (live position)

### Updates
- Driver marker updates smoothly without flicker
- Map maintains stable view
- Route displays when parcel is in transit

## Environment Configuration

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000
```

### Backend (settings.py)
- WebSocket routing configured in `asgi.py`
- Channel layers for message broadcasting
- JWT middleware for authentication

## Connection Lifecycle

### Connection Flow
1. User opens tracking page
2. Hook retrieves JWT from localStorage
3. WebSocket connects with URL: `ws://localhost:8000/ws/tracking/?parcel_id=<ID>&token=<JWT>`
4. Backend validates token and checks permissions
5. User joins parcel group
6. Connection established

### Disconnection Flow
1. User navigates away or closes page
2. `disconnect()` called in cleanup
3. WebSocket closes cleanly
4. User leaves parcel group

### Reconnection Logic
- Automatic reconnection on unexpected disconnect
- Max 5 attempts with 3-second delay
- Exponential backoff not implemented (constant delay)
- Manual disconnect prevents reconnection

## Error Handling

### Frontend Errors
- Connection failures
- Invalid JSON messages
- Token expiration
- Network issues

### Backend Errors
- Invalid location data
- Unauthorized access attempts
- Missing parcel ID
- Database errors

### User Feedback
- Toast notifications for important events
- Connection status indicators
- Error messages in console
- Reconnection attempts logged

## Testing

### Backend Tests
Location: `backend/test_tracking_simple.py`

Tests:
- Driver assignment verification
- Location persistence
- Access control
- Coordinate validation

### Manual Testing Checklist

**Client View**:
- [ ] Connect to WebSocket when parcel selected
- [ ] Receive driver location updates
- [ ] Display driver marker on map
- [ ] Show connection status
- [ ] Handle disconnections gracefully
- [ ] Cannot send location updates

**Driver View**:
- [ ] Manual tracking toggle works
- [ ] GPS location captured
- [ ] Location sent every 5 seconds
- [ ] Connection status displayed
- [ ] Tracking stops on toggle off
- [ ] Location updates persist to DB

**Security**:
- [ ] Client cannot send location
- [ ] Unauthorized driver rejected
- [ ] JWT validation works
- [ ] Parcel access verified

## Performance Considerations

### Frontend
- Single WebSocket per parcel view
- Automatic cleanup on unmount
- Efficient state updates
- No unnecessary re-renders

### Backend
- Channel layers for scalability
- Database writes every 5th update
- Async/await throughout
- Group-based broadcasting

## Known Limitations

1. **Single Parcel Tracking**: Hook connects to one parcel at a time
2. **No History Replay**: Only live updates shown
3. **GPS Accuracy**: Depends on device/browser
4. **Reconnection Limit**: Max 5 attempts
5. **No Offline Queue**: Updates lost if disconnected

## Future Enhancements

1. **Location History**: Show driver's path over time
2. **ETA Calculation**: Predict arrival time
3. **Geofencing**: Alerts for pickup/drop zones
4. **Multi-parcel**: Track multiple parcels simultaneously
5. **Offline Support**: Queue updates when offline
6. **Push Notifications**: Browser notifications for updates

## Troubleshooting

### Connection Issues

**Problem**: WebSocket won't connect
- Check backend is running
- Verify WebSocket URL in .env
- Confirm JWT token in localStorage
- Check browser console for errors

**Problem**: "Unauthorized" error
- JWT token may be expired
- User not assigned to parcel
- Backend authentication issue

### Location Updates

**Problem**: Location not updating
- Check GPS permissions granted
- Verify tracking is enabled
- Confirm WebSocket connected
- Check backend logs

**Problem**: Map marker not moving
- Verify location format correct
- Check marker ID consistency
- Inspect MapContainer props

## Code Structure

```
frontend/src/
├── hooks/
│   └── useTrackingSocket.ts      # WebSocket connection hook
├── types/
│   └── tracking.ts                # TypeScript interfaces
├── client/
│   └── TrackParcel.tsx            # Client tracking view
└── driver/
    └── DriverNavigation.tsx       # Driver location sending

backend/
├── track_driver/
│   ├── consumers.py               # WebSocket consumer
│   ├── middleware.py              # JWT authentication
│   ├── routing.py                 # WebSocket URL routing
│   └── models.py                  # Location data models
└── config/
    └── asgi.py                    # ASGI configuration
```

## Dependencies

### Frontend
- `leaflet` - Map rendering
- `sonner` - Toast notifications
- React hooks (useEffect, useRef, useState, useCallback)

### Backend
- `channels` - WebSocket support
- `djangorestframework-simplejwt` - JWT authentication
- `daphne` - ASGI server

## Deployment Considerations

### Production WebSocket URL
Update `.env` for production:
```bash
VITE_WS_URL=wss://yourdomain.com
```

### SSL/TLS
- Use `wss://` instead of `ws://`
- Ensure backend has valid SSL certificate
- Configure Django ALLOWED_HOSTS

### Scaling
- Use Redis for channel layers
- Consider WebSocket connection limits
- Load balancer sticky sessions

---

**Last Updated**: January 8, 2026
**Version**: 1.0.0
