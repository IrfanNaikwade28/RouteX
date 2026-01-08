from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone

from client.models import Parcel
from .models import DriverAssignment
from .serializers import (
    DriverTaskSerializer,
    ParcelStatusUpdateSerializer,
    RouteSerializer
)


class DriverTasksView(APIView):
    """
    GET /api/driver/tasks/
    List all parcels where status='accepted' and assigned to the logged-in driver.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all assigned parcels for the driver (including delivered ones)."""
        print(f"[DEBUG] Driver tasks requested by user: {request.user.email} (ID: {request.user.id})")
        
        # Get all driver assignments for the current user
        assignments = DriverAssignment.objects.filter(
            driver=request.user
        ).select_related('parcel', 'parcel__client')
        
        print(f"[DEBUG] Found {assignments.count()} driver assignments for user {request.user.email}")
        for assignment in assignments:
            print(f"[DEBUG] Assignment ID: {assignment.id}, Parcel: {assignment.parcel.tracking_number}, Status: {assignment.parcel.current_status}")
        
        # Get ALL parcels from assignments (including delivered ones)
        # Frontend will handle filtering by status for active/completed tabs
        parcels = Parcel.objects.filter(
            id__in=[assignment.parcel.id for assignment in assignments]
        ).select_related('client').order_by('-created_at')
        
        print(f"[DEBUG] Returning {parcels.count()} total parcels (including delivered)")
        
        serializer = DriverTaskSerializer(parcels, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ParcelStatusUpdateView(APIView):
    """
    PATCH /api/driver/parcel/<id>/update-status/
    Allow drivers to change status to IN_TRANSIT or DELIVERED.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, id):
        """Update parcel status."""
        # Verify the parcel is assigned to the driver
        assignment = get_object_or_404(
            DriverAssignment,
            parcel_id=id,
            driver=request.user
        )
        
        parcel = assignment.parcel
        
        # Serialize and validate the status update
        serializer = ParcelStatusUpdateSerializer(
            parcel,
            data=request.data,
            partial=True
        )
        
        if serializer.is_valid():
            old_status = parcel.current_status
            new_status = serializer.validated_data.get('current_status')
            
            # Validate status transition
            valid_transitions = {
                'assigned': ['picked_up'],
                'picked_up': ['in_transit'],
                'in_transit': ['out_for_delivery', 'delivered'],
                'out_for_delivery': ['delivered'],
            }
            
            if old_status not in valid_transitions:
                return Response({
                    'error': f'Cannot update status from {old_status}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if new_status not in valid_transitions.get(old_status, []):
                return Response({
                    'error': f'Invalid status transition from {old_status} to {new_status}. '
                            f'Valid transitions: {", ".join(valid_transitions.get(old_status, []))}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            serializer.save()
            
            # Create status history entry
            from client.models import ParcelStatusHistory
            ParcelStatusHistory.objects.create(
                parcel=parcel,
                status=parcel.current_status,
                location=parcel.to_location if parcel.current_status == 'delivered' else parcel.from_location,
                notes=f'Status changed from {old_status} to {parcel.current_status} by driver',
                created_by=request.user
            )
            
            # Update assignment timestamps
            if parcel.current_status == 'picked_up' and not assignment.started_at:
                assignment.started_at = timezone.now()
                assignment.save()
            elif parcel.current_status == 'delivered' and not assignment.completed_at:
                assignment.completed_at = timezone.now()
                assignment.save()
            
            # Create notification for client when status changes
            from client.models import Notification
            status_messages = {
                'picked_up': 'Your parcel has been picked up by the driver',
                'in_transit': 'Your parcel is in transit',
                'out_for_delivery': 'Your parcel is out for delivery',
                'delivered': 'Your parcel has been delivered successfully'
            }
            if parcel.current_status in status_messages:
                Notification.objects.create(
                    client=parcel.client,
                    parcel=parcel,
                    notification_type='status_update',
                    title='Parcel Status Update',
                    message=f"{status_messages[parcel.current_status]}. Tracking: {parcel.tracking_number}"
                )
            
            return Response({
                'message': f'Parcel status updated to {parcel.current_status}',
                'parcel_id': parcel.id,
                'status': parcel.current_status
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DriverRouteView(APIView):
    """
    GET /api/driver/route/<parcel_id>/
    Return the pickup_lat/lng and drop_lat/lng for Leaflet Routing Machine.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, parcel_id):
        """Get route coordinates for a parcel."""
        # Verify the parcel is assigned to the driver
        assignment = get_object_or_404(
            DriverAssignment,
            parcel_id=parcel_id,
            driver=request.user
        )
        
        parcel = assignment.parcel
        
        # Check if coordinates are available
        if not all([parcel.pickup_lat, parcel.pickup_lng, parcel.drop_lat, parcel.drop_lng]):
            return Response({
                'error': 'Route coordinates not available for this parcel'
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = RouteSerializer(parcel)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DriverVehicleInfoView(APIView):
    """
    GET /api/driver/vehicle-info/
    Return vehicle information for the logged-in driver.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get vehicle information for the driver."""
        # Try to get driver profile from admin_dashboard
        try:
            from admin_dashboard.models import Driver
            driver = Driver.objects.get(user=request.user)
            return Response({
                'driver_id': driver.id,
                'name': driver.name,
                'phone_number': driver.phone_number,
                'vehicle_number': driver.vehicle_number,
                'vehicle_type': driver.vehicle_type,
                'is_available': driver.is_available,
            }, status=status.HTTP_200_OK)
        except Driver.DoesNotExist:
            return Response({
                'error': 'Driver profile not found. Please contact admin to set up your driver profile.'
            }, status=status.HTTP_404_NOT_FOUND)


class DriverClientContactView(APIView):
    """
    GET /api/driver/parcel/<parcel_id>/client-contact/
    Return client contact information for a specific parcel.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, parcel_id):
        """Get client contact information for a parcel."""
        # Verify the parcel is assigned to the driver
        assignment = get_object_or_404(
            DriverAssignment,
            parcel_id=parcel_id,
            driver=request.user
        )
        
        parcel = assignment.parcel
        client = parcel.client
        
        return Response({
            'client_id': client.id,
            'client_name': client.full_name,
            'client_email': client.email,
            'client_phone': client.phone_number,
            'parcel_tracking_number': parcel.tracking_number,
        }, status=status.HTTP_200_OK)
