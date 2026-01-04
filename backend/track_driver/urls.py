from django.urls import path
from .views import (
    DriverTasksView,
    ParcelStatusUpdateView,
    DriverRouteView,
    DriverVehicleInfoView,
    DriverClientContactView
)

app_name = 'track_driver'

urlpatterns = [
    path('tasks/', DriverTasksView.as_view(), name='driver-tasks'),
    path('parcel/<int:id>/update-status/', ParcelStatusUpdateView.as_view(), name='parcel-update-status'),
    path('route/<int:parcel_id>/', DriverRouteView.as_view(), name='driver-route'),
    path('vehicle-info/', DriverVehicleInfoView.as_view(), name='driver-vehicle-info'),
    path('parcel/<int:parcel_id>/client-contact/', DriverClientContactView.as_view(), name='driver-client-contact'),
]

