from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import Parcel, ParcelStatusHistory, Notification, PricingRule
from .serializers import (
    ClientProfileSerializer,
    ParcelCreateSerializer,
    ParcelListSerializer,
    ParcelDetailSerializer,
    ParcelStatusHistorySerializer,
    NotificationSerializer,
    PricingRuleSerializer
)
from .permissions import IsOwnerOrReadOnly, IsParcelOwner


class ClientProfileView(APIView):
    """
    GET: Retrieve the authenticated client's profile
    PUT/PATCH: Update the authenticated client's profile
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get the current user's profile."""
        serializer = ClientProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def put(self, request):
        """Update the current user's profile."""
        serializer = ClientProfileSerializer(
            request.user, 
            data=request.data, 
            partial=False
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def patch(self, request):
        """Partially update the current user's profile."""
        serializer = ClientProfileSerializer(
            request.user, 
            data=request.data, 
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CreateParcelView(generics.CreateAPIView):
    """
    POST: Create a new parcel delivery request
    """
    serializer_class = ParcelCreateSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        """Save the parcel with the current user as the client."""
        serializer.save()
    
    def create(self, request, *args, **kwargs):
        """Override create to return detailed parcel information."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        parcel = serializer.save()
        
        # Return detailed parcel information
        detail_serializer = ParcelDetailSerializer(parcel)
        return Response(
            detail_serializer.data, 
            status=status.HTTP_201_CREATED
        )


class ClientParcelListView(generics.ListAPIView):
    """
    GET: List all parcels for the authenticated client
    Supports filtering by status and search by tracking number
    """
    serializer_class = ParcelListSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return parcels only for the authenticated client."""
        queryset = Parcel.objects.filter(client=self.request.user)
        
        # Filter by status if provided
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(current_status=status_filter)
        
        # Search by tracking number
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(tracking_number__icontains=search) |
                Q(from_location__icontains=search) |
                Q(to_location__icontains=search)
            )
        
        return queryset.select_related('client')


class ClientParcelDetailView(generics.RetrieveAPIView):
    """
    GET: Retrieve detailed information about a specific parcel
    Only the owner can view their parcel details
    """
    serializer_class = ParcelDetailSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsParcelOwner]
    lookup_field = 'id'
    
    def get_queryset(self):
        """Return parcels only for the authenticated client."""
        return Parcel.objects.filter(client=self.request.user).prefetch_related(
            'status_history',
            'status_history__created_by'
        )


class ParcelTrackingView(APIView):
    """
    GET: Track a parcel's status history
    Returns all status updates for a specific parcel
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsParcelOwner]
    
    def get(self, request, parcel_id):
        """Get status history for a specific parcel."""
        # Verify the parcel belongs to the authenticated user
        parcel = get_object_or_404(
            Parcel, 
            id=parcel_id, 
            client=request.user
        )
        
        # Check permission
        self.check_object_permissions(request, parcel)
        
        # Get status history
        status_history = ParcelStatusHistory.objects.filter(
            parcel=parcel
        ).select_related('created_by').order_by('-created_at')
        
        serializer = ParcelStatusHistorySerializer(status_history, many=True)
        
        return Response({
            'parcel_id': parcel.id,
            'tracking_number': parcel.tracking_number,
            'current_status': parcel.current_status,
            'status_display': parcel.get_current_status_display(),
            'status_history': serializer.data
        }, status=status.HTTP_200_OK)


class ClientNotificationListView(generics.ListAPIView):
    """
    GET: List all notifications for the authenticated client
    Supports filtering by read/unread status
    """
    serializer_class = NotificationSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return notifications only for the authenticated client."""
        queryset = Notification.objects.filter(client=self.request.user)
        
        # Filter by read status if provided
        is_read = self.request.query_params.get('is_read', None)
        if is_read is not None:
            is_read_bool = is_read.lower() in ['true', '1', 'yes']
            queryset = queryset.filter(is_read=is_read_bool)
        
        return queryset.select_related('parcel')


class NotificationDetailView(generics.RetrieveUpdateAPIView):
    """
    GET: Retrieve a specific notification
    PATCH/PUT: Mark notification as read/unread
    """
    serializer_class = NotificationSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        """Return notifications only for the authenticated client."""
        return Notification.objects.filter(client=self.request.user)
    
    def update(self, request, *args, **kwargs):
        """Update notification (typically to mark as read)."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


class MarkNotificationAsReadView(APIView):
    """
    POST: Mark a notification as read
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request, notification_id):
        """Mark a specific notification as read."""
        notification = get_object_or_404(
            Notification,
            id=notification_id,
            client=request.user
        )
        
        notification.is_read = True
        notification.save()
        
        serializer = NotificationSerializer(notification)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MarkAllNotificationsAsReadView(APIView):
    """
    POST: Mark all notifications as read for the authenticated client
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Mark all notifications as read for the current user."""
        updated_count = Notification.objects.filter(
            client=request.user,
            is_read=False
        ).update(is_read=True)
        
        return Response({
            'message': f'{updated_count} notification(s) marked as read',
            'count': updated_count
        }, status=status.HTTP_200_OK)


class PricingRuleListView(generics.ListAPIView):
    """
    GET: List all active pricing rules
    This helps clients understand pricing before creating a parcel
    """
    serializer_class = PricingRuleSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return only active pricing rules."""
        return PricingRule.objects.filter(is_active=True).order_by('min_weight')


class ParcelStatsView(APIView):
    """
    GET: Get statistics about the client's parcels
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get parcel statistics for the authenticated client."""
        parcels = Parcel.objects.filter(client=request.user)
        
        total_parcels = parcels.count()
        requested = parcels.filter(current_status='requested').count()
        accepted = parcels.filter(current_status='accepted').count()
        assigned = parcels.filter(current_status='assigned').count()
        in_transit = parcels.filter(current_status='in_transit').count()
        delivered = parcels.filter(current_status='delivered').count()
        cancelled = parcels.filter(current_status='cancelled').count()
        
        unread_notifications = Notification.objects.filter(
            client=request.user,
            is_read=False
        ).count()
        
        return Response({
            'total_parcels': total_parcels,
            'requested': requested,
            'accepted': accepted,
            'assigned': assigned,
            'in_transit': in_transit,
            'delivered': delivered,
            'cancelled': cancelled,
            'unread_notifications': unread_notifications
        }, status=status.HTTP_200_OK)


class ParcelDriverContactView(APIView):
    """
    GET: Get driver contact information for a specific parcel
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsParcelOwner]
    
    def get(self, request, parcel_id):
        """Get driver contact information for a parcel."""
        parcel = get_object_or_404(
            Parcel,
            id=parcel_id,
            client=request.user
        )
        
        # Check permission
        self.check_object_permissions(request, parcel)
        
        # Get driver assignment
        try:
            from track_driver.models import DriverAssignment
            assignment = DriverAssignment.objects.get(parcel=parcel)
            driver = assignment.driver
            
            # Try to get driver profile from admin_dashboard
            try:
                from admin_dashboard.models import Driver as AdminDriver
                driver_profile = AdminDriver.objects.get(user=driver)
                return Response({
                    'driver_id': driver.id,
                    'driver_name': driver_profile.name,
                    'driver_phone': driver_profile.phone_number,
                    'vehicle_number': driver_profile.vehicle_number,
                    'parcel_tracking_number': parcel.tracking_number,
                }, status=status.HTTP_200_OK)
            except AdminDriver.DoesNotExist:
                return Response({
                    'driver_id': driver.id,
                    'driver_name': driver.full_name,
                    'driver_phone': driver.phone_number,
                    'vehicle_number': 'N/A',
                    'parcel_tracking_number': parcel.tracking_number,
                }, status=status.HTTP_200_OK)
        except DriverAssignment.DoesNotExist:
            return Response({
                'error': 'No driver assigned to this parcel yet'
            }, status=status.HTTP_404_NOT_FOUND)
