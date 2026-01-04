from rest_framework import viewsets, status, generics
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import Driver, DriverLocation
from .serializers import (
    DriverSerializer, ParcelRequestSerializer, AssignDriverSerializer,
    LiveDriverSerializer, LiveParcelSerializer
)
from client.models import Parcel
from . import services


class DriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer


class ParcelRequestListView(generics.ListAPIView):
    queryset = Parcel.objects.filter(current_status='requested')
    serializer_class = ParcelRequestSerializer


class AcceptParcelAPIView(APIView):
    def patch(self, request, pk):
        parcel = get_object_or_404(Parcel, pk=pk)
        services.accept_parcel(parcel, actor=None)
        return Response({'status': 'accepted'}, status=status.HTTP_200_OK)


class RejectParcelAPIView(APIView):
    def patch(self, request, pk):
        parcel = get_object_or_404(Parcel, pk=pk)
        notes = request.data.get('notes')
        services.reject_parcel(parcel, actor=None, notes=notes)
        return Response({'status': 'rejected'}, status=status.HTTP_200_OK)


class AssignDriverAPIView(APIView):
    def post(self, request):
        serializer = AssignDriverSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        parcel_id = serializer.validated_data['parcel_id']
        driver_id = serializer.validated_data['driver_id']

        parcel = get_object_or_404(Parcel, pk=parcel_id)
        driver = get_object_or_404(Driver, pk=driver_id)

        try:
            assignment = services.assign_driver_to_parcel(parcel, driver, actor=None)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'assigned': True, 'assignment_id': assignment.id}, status=status.HTTP_201_CREATED)


class LiveDriversAPIView(APIView):
    def get(self, request):
        drivers = Driver.objects.all()
        results = []
        for d in drivers:
            loc = services.get_latest_driver_location_for_driver(d)
            assigned_parcel = None
            parcel_status = None
            # check admin assignment
            assignment = getattr(d.assignments.first(), 'parcel', None)
            if assignment:
                assigned_parcel = assignment.id
                parcel_status = assignment.current_status

            entry = {
                'driver_id': d.id,
                'latitude': loc['latitude'] if loc else None,
                'longitude': loc['longitude'] if loc else None,
                'speed': loc.get('speed') if loc else None,
                'assigned_parcel': assigned_parcel,
                'parcel_status': parcel_status,
            }
            results.append(entry)

        serializer = LiveDriverSerializer(results, many=True)
        return Response(serializer.data)


class LiveParcelsAPIView(APIView):
    def get(self, request):
        # Find parcels that have admin assignments or track assignments
        parcels = Parcel.objects.filter(current_status__in=['accepted', 'assigned', 'in_transit', 'picked_up', 'out_for_delivery'])
        results = []
        for p in parcels:
            loc = services.get_latest_location_for_parcel(p)
            driver_id = None
            # prefer admin assignment
            if hasattr(p, 'admin_assignment') and p.admin_assignment:
                driver_id = p.admin_assignment.driver.id

            entry = {
                'parcel_id': p.id,
                'tracking_number': p.tracking_number,
                'latitude': loc['latitude'] if loc else None,
                'longitude': loc['longitude'] if loc else None,
                'driver_id': driver_id,
                'parcel_status': p.current_status,
            }
            results.append(entry)

        serializer = LiveParcelSerializer(results, many=True)
        return Response(serializer.data)


class ParcelRouteView(APIView):
    """
    GET /api/admin/parcel/<parcel_id>/route/
    Return route coordinates for a parcel (for admin to view parcel route).
    """
    def get(self, request, parcel_id):
        """Get route coordinates for a parcel."""
        parcel = get_object_or_404(Parcel, pk=parcel_id)
        
        # Check if coordinates are available
        if not all([parcel.pickup_lat, parcel.pickup_lng, parcel.drop_lat, parcel.drop_lng]):
            return Response({
                'error': 'Route coordinates not available for this parcel'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get driver info if assigned
        driver_info = None
        if hasattr(parcel, 'admin_assignment') and parcel.admin_assignment:
            driver = parcel.admin_assignment.driver
            driver_info = {
                'driver_id': driver.id,
                'driver_name': driver.name,
                'driver_phone': driver.phone_number,
                'vehicle_number': driver.vehicle_number,
            }
        
        return Response({
            'parcel_id': parcel.id,
            'tracking_number': parcel.tracking_number,
            'pickup_lat': float(parcel.pickup_lat),
            'pickup_lng': float(parcel.pickup_lng),
            'drop_lat': float(parcel.drop_lat),
            'drop_lng': float(parcel.drop_lng),
            'from_location': parcel.from_location,
            'to_location': parcel.to_location,
            'driver': driver_info,
            'current_status': parcel.current_status,
        }, status=status.HTTP_200_OK)