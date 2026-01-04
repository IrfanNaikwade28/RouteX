from django.utils import timezone
from client.models import Parcel, ParcelStatusHistory
from .models import AdminAssignment, Driver, DriverLocation
from track_driver.models import DriverAssignment as TrackDriverAssignment


def accept_parcel(parcel: Parcel, actor=None):
    if parcel.current_status != 'requested':
        raise ValueError('Parcel must be in requested status to be accepted')
    
    parcel.current_status = 'accepted'
    parcel.save(update_fields=['current_status', 'updated_at'])
    ParcelStatusHistory.objects.create(parcel=parcel, status='accepted', created_by=actor)
    
    # Create notification for client
    from client.models import Notification
    Notification.objects.create(
        client=parcel.client,
        parcel=parcel,
        notification_type='status_update',
        title='Parcel Accepted',
        message=f'Your parcel {parcel.tracking_number} has been accepted and is awaiting driver assignment'
    )
    
    return parcel


def reject_parcel(parcel: Parcel, actor=None, notes=None):
    parcel.current_status = 'cancelled'
    parcel.save(update_fields=['current_status', 'updated_at'])
    ParcelStatusHistory.objects.create(parcel=parcel, status='cancelled', notes=notes, created_by=actor)
    return parcel


def assign_driver_to_parcel(parcel: Parcel, driver: Driver, actor=None):
    # Only allow assigning if parcel is accepted
    if parcel.current_status != 'accepted':
        raise ValueError('Parcel must be in accepted status to be assigned')

    # Create admin assignment
    assignment, created = AdminAssignment.objects.get_or_create(parcel=parcel, defaults={'driver': driver})
    if not created:
        assignment.driver = driver
        assignment.save(update_fields=['driver'])

    # Update parcel status to 'assigned'
    parcel.current_status = 'assigned'
    parcel.save(update_fields=['current_status', 'updated_at'])
    ParcelStatusHistory.objects.create(parcel=parcel, status='assigned', created_by=actor)

    # Always create/update TrackDriverAssignment if driver has user account
    if driver.user:
        TrackDriverAssignment.objects.update_or_create(parcel=parcel, defaults={'driver': driver.user})
    else:
        # If driver doesn't have user account, we should still create assignment
        # but driver won't be able to use driver app until linked
        pass

    # Create notification for client
    from client.models import Notification
    Notification.objects.create(
        client=parcel.client,
        parcel=parcel,
        notification_type='status_update',
        title='Driver Assigned',
        message=f'Driver {driver.name} has been assigned to your parcel {parcel.tracking_number}'
    )

    return assignment


def get_latest_driver_location_for_driver(driver: Driver):
    # Prefer track_driver locations if driver is linked to a user
    if driver.user:
        from track_driver.models import DriverLocation as TrackDriverLocation
        loc = TrackDriverLocation.objects.filter(driver=driver.user).order_by('-timestamp').first()
        if loc:
            return {
                'latitude': loc.latitude,
                'longitude': loc.longitude,
                'speed': None,
                'timestamp': loc.timestamp,
                'parcel': getattr(loc, 'parcel', None),
            }

    # Fallback to admin stored locations
    loc = DriverLocation.objects.filter(driver=driver).order_by('-updated_at').first()
    if loc:
        return {
            'latitude': loc.latitude,
            'longitude': loc.longitude,
            'speed': loc.speed,
            'timestamp': loc.updated_at,
            'parcel': loc.parcel,
        }

    return None


def get_latest_location_for_parcel(parcel: Parcel):
    # Check track_driver locations first
    from track_driver.models import DriverLocation as TrackDriverLocation
    loc = TrackDriverLocation.objects.filter(parcel=parcel).order_by('-timestamp').first()
    if loc:
        return {'latitude': loc.latitude, 'longitude': loc.longitude, 'driver': getattr(loc.driver, 'id', None), 'timestamp': loc.timestamp}

    # Fallback to admin locations
    loc = DriverLocation.objects.filter(parcel=parcel).order_by('-updated_at').first()
    if loc:
        return {'latitude': loc.latitude, 'longitude': loc.longitude, 'driver': getattr(loc.driver, 'id', None), 'timestamp': loc.updated_at}

    return None
