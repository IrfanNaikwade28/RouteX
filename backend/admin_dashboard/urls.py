from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DriverViewSet, ParcelRequestListView, AcceptParcelAPIView,
    RejectParcelAPIView, AssignDriverAPIView, LiveDriversAPIView, LiveParcelsAPIView,
    ParcelRouteView
)

router = DefaultRouter()
router.register(r'drivers', DriverViewSet, basename='admin-drivers')

urlpatterns = [
    path('', include(router.urls)),
    path('parcel-requests/', ParcelRequestListView.as_view(), name='parcel-requests'),
    path('parcel-requests/<int:pk>/accept/', AcceptParcelAPIView.as_view(), name='parcel-accept'),
    path('parcel-requests/<int:pk>/reject/', RejectParcelAPIView.as_view(), name='parcel-reject'),
    path('assign-driver/', AssignDriverAPIView.as_view(), name='assign-driver'),
    path('live-drivers/', LiveDriversAPIView.as_view(), name='live-drivers'),
    path('live-parcels/', LiveParcelsAPIView.as_view(), name='live-parcels'),
    path('parcel/<int:parcel_id>/route/', ParcelRouteView.as_view(), name='parcel-route'),
]
