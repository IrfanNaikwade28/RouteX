# Client App - Parcel Management System

## Overview

The **Client App** is a Django REST Framework application that provides comprehensive parcel management functionality for clients in the RouteX Parcel Management System. It enables authenticated clients to create, track, and manage their parcel deliveries with full JWT authentication and authorization.

## Features

### 1. **Client Profile Management**
- View and update client profile information
- Secure access to personal data

### 2. **Parcel Management**
- Create new parcel delivery requests
- Automatic tracking number generation (Format: `PMS-XXXXXXXX`)
- Automatic price calculation based on weight and distance
- View list of all parcels with filtering and search
- View detailed parcel information
- Track parcel status history

### 3. **Status Tracking**
- Real-time parcel status updates
- Complete status history with timestamps
- Status options: Pending, Picked Up, In Transit, Out for Delivery, Delivered, Cancelled, Failed

### 4. **Notifications**
- Automatic notifications for parcel creation
- Status update notifications
- Mark notifications as read/unread
- Bulk mark all as read functionality

### 5. **Pricing System**
- Dynamic pricing based on weight ranges
- Distance-based pricing calculation
- View available pricing rules

### 6. **Statistics Dashboard**
- Total parcels count
- Status-wise breakdown
- Unread notifications count

## Models

### PricingRule
Defines pricing structure based on weight ranges:
- `min_weight`: Minimum weight in kg
- `max_weight`: Maximum weight in kg
- `base_price`: Base price for the weight range
- `price_per_km`: Additional price per kilometer
- `is_active`: Whether the rule is currently active

### Parcel
Main parcel entity with:
- `client`: Foreign key to Client (User)
- `tracking_number`: Unique tracking identifier
- `from_location`: Pickup location
- `to_location`: Delivery location
- `pickup_stop_id`: Optional pickup stop identifier
- `drop_stop_id`: Optional drop stop identifier
- `weight`, `height`, `width`, `breadth`: Parcel dimensions
- `price`: Calculated delivery price
- `distance_km`: Distance in kilometers
- `current_status`: Current parcel status
- `description`: Optional parcel description
- `special_instructions`: Special handling instructions

### ParcelStatusHistory
Tracks all status changes:
- `parcel`: Foreign key to Parcel
- `status`: Status at this point
- `location`: Location of status update
- `notes`: Additional notes
- `created_by`: User who created the update
- `created_at`: Timestamp

### Notification
Client notifications:
- `client`: Foreign key to Client
- `parcel`: Related parcel (optional)
- `notification_type`: Type of notification
- `title`: Notification title
- `message`: Notification message
- `is_read`: Read status
- `created_at`: Timestamp

## API Endpoints

### Authentication Required
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Client Profile
```
GET    /api/client/profile/          # Get client profile
PUT    /api/client/profile/          # Update client profile (full)
PATCH  /api/client/profile/          # Update client profile (partial)
```

### Parcel Management
```
GET    /api/client/parcels/          # List all parcels
       Query params:
       - status: Filter by status (e.g., ?status=pending)
       - search: Search by tracking number or location

POST   /api/client/parcels/create/   # Create new parcel
GET    /api/client/parcels/<id>/     # Get parcel details
GET    /api/client/parcels/<id>/track/ # Track parcel status history
```

### Statistics
```
GET    /api/client/stats/            # Get parcel statistics
```

### Notifications
```
GET    /api/client/notifications/    # List all notifications
       Query params:
       - is_read: Filter by read status (e.g., ?is_read=false)

GET    /api/client/notifications/<id>/           # Get notification details
PATCH  /api/client/notifications/<id>/           # Update notification
POST   /api/client/notifications/<id>/mark-read/ # Mark as read
POST   /api/client/notifications/mark-all-read/  # Mark all as read
```

### Pricing
```
GET    /api/client/pricing-rules/    # List active pricing rules
```

## Request/Response Examples

### Create Parcel
**Request:**
```json
POST /api/client/parcels/create/
{
  "from_location": "123 Main St, New York, NY",
  "to_location": "456 Oak Ave, Los Angeles, CA",
  "weight": 5.5,
  "height": 30.0,
  "width": 20.0,
  "breadth": 15.0,
  "distance_km": 450.0,
  "description": "Electronics package",
  "special_instructions": "Handle with care - fragile items"
}
```

**Response:**
```json
{
  "id": 1,
  "tracking_number": "PMS-A1B2C3D4",
  "client": 1,
  "client_name": "John Doe",
  "client_email": "john@example.com",
  "client_phone": "+1234567890",
  "from_location": "123 Main St, New York, NY",
  "to_location": "456 Oak Ave, Los Angeles, CA",
  "weight": "5.50",
  "height": "30.00",
  "width": "20.00",
  "breadth": "15.00",
  "price": "2350.00",
  "distance_km": "450.00",
  "current_status": "pending",
  "status_display": "Pending",
  "description": "Electronics package",
  "special_instructions": "Handle with care - fragile items",
  "status_history": [
    {
      "id": 1,
      "status": "pending",
      "location": "123 Main St, New York, NY",
      "notes": "Parcel created and awaiting pickup",
      "created_by_name": "John Doe",
      "created_at": "2026-01-02T12:00:00Z"
    }
  ],
  "created_at": "2026-01-02T12:00:00Z",
  "updated_at": "2026-01-02T12:00:00Z"
}
```

### List Parcels
**Request:**
```
GET /api/client/parcels/?status=pending
```

**Response:**
```json
[
  {
    "id": 1,
    "tracking_number": "PMS-A1B2C3D4",
    "client_name": "John Doe",
    "from_location": "123 Main St, New York, NY",
    "to_location": "456 Oak Ave, Los Angeles, CA",
    "weight": "5.50",
    "price": "2350.00",
    "current_status": "pending",
    "status_display": "Pending",
    "created_at": "2026-01-02T12:00:00Z",
    "updated_at": "2026-01-02T12:00:00Z"
  }
]
```

### Track Parcel
**Request:**
```
GET /api/client/parcels/1/track/
```

**Response:**
```json
{
  "parcel_id": 1,
  "tracking_number": "PMS-A1B2C3D4",
  "current_status": "in_transit",
  "status_display": "In Transit",
  "status_history": [
    {
      "id": 3,
      "status": "in_transit",
      "location": "Distribution Center, Chicago",
      "notes": "Package in transit",
      "created_by_name": "System",
      "created_at": "2026-01-02T14:00:00Z"
    },
    {
      "id": 2,
      "status": "picked_up",
      "location": "123 Main St, New York, NY",
      "notes": "Package picked up",
      "created_by_name": "Driver John",
      "created_at": "2026-01-02T13:00:00Z"
    },
    {
      "id": 1,
      "status": "pending",
      "location": "123 Main St, New York, NY",
      "notes": "Parcel created and awaiting pickup",
      "created_by_name": "John Doe",
      "created_at": "2026-01-02T12:00:00Z"
    }
  ]
}
```

### Get Statistics
**Request:**
```
GET /api/client/stats/
```

**Response:**
```json
{
  "total_parcels": 10,
  "pending": 2,
  "in_transit": 3,
  "delivered": 4,
  "cancelled": 1,
  "unread_notifications": 5
}
```

## Permissions & Security

### Authentication
- All endpoints require JWT authentication
- Token must be included in the `Authorization` header as `Bearer <token>`

### Authorization
- Clients can only access their own data
- Custom permissions ensure data isolation:
  - `IsParcelOwner`: Ensures parcel belongs to the requesting client
  - `IsNotificationOwner`: Ensures notification belongs to the requesting client

### Data Validation
- All input data is validated using serializers
- Weight, dimensions, and distance must be positive values
- Automatic price calculation prevents price manipulation

## Admin Interface

All models are registered in Django Admin with:
- Custom list displays
- Filters and search functionality
- Inline editing for related models
- Custom actions (e.g., mark notifications as read)
- Automatic status update and notification creation

## Setup Instructions

### 1. Install Dependencies
```bash
pip install djangorestframework djangorestframework-simplejwt
```

### 2. Add to INSTALLED_APPS
```python
INSTALLED_APPS = [
    # ...
    'rest_framework',
    'rest_framework_simplejwt',
    'client',
]
```

### 3. Configure URLs
```python
# config/urls.py
urlpatterns = [
    path('api/client/', include('client.urls')),
]
```

### 4. Run Migrations
```bash
python manage.py makemigrations client
python manage.py migrate client
```

### 5. Populate Pricing Rules
```bash
python manage.py populate_pricing_rules
```

## Testing

### Run Test Script
```bash
python test_client_api.py
```

This script tests all endpoints including:
- User registration and login
- Profile management
- Parcel creation and listing
- Tracking functionality
- Notifications
- Statistics

### Manual Testing with cURL

**Create Parcel:**
```bash
curl -X POST http://localhost:8000/api/client/parcels/create/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "from_location": "New York",
    "to_location": "Los Angeles",
    "weight": 5.5,
    "height": 30,
    "width": 20,
    "breadth": 15,
    "distance_km": 450
  }'
```

**List Parcels:**
```bash
curl -X GET http://localhost:8000/api/client/parcels/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Database Schema

### Indexes
- `parcels`: Composite index on (client, created_at), unique index on tracking_number
- `parcel_status_history`: Composite index on (parcel, created_at)
- `notifications`: Composite index on (client, created_at), index on is_read

### Relationships
- Parcel → Client (Many-to-One)
- ParcelStatusHistory → Parcel (Many-to-One)
- ParcelStatusHistory → Client (Many-to-One, optional)
- Notification → Client (Many-to-One)
- Notification → Parcel (Many-to-One, optional)

## Business Logic

### Price Calculation
1. Find applicable pricing rule based on parcel weight
2. Calculate: `price = base_price + (price_per_km × distance_km)`
3. If no rule found, use default: `₹100 + ₹10/km`

### Tracking Number Generation
- Format: `PMS-XXXXXXXX` (8 random hex characters)
- Guaranteed unique across all parcels

### Automatic Notifications
- Created on parcel creation
- Created on status updates (via admin)
- Includes relevant parcel information

## Future Enhancements

- [ ] Real-time notifications via WebSockets
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Payment integration
- [ ] Parcel insurance options
- [ ] Delivery scheduling
- [ ] Multi-parcel shipments
- [ ] Address validation
- [ ] Distance calculation via Google Maps API
- [ ] Delivery proof (signature/photo)

## Support

For issues or questions, please contact the development team or create an issue in the project repository.

---

**Version:** 1.0.0  
**Last Updated:** January 2, 2026  
**Author:** RouteX Development Team
