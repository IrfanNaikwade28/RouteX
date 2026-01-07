from django.urls import path
from .views import (
    ClientProfileView,
    CreateParcelView,
    ClientParcelListView,
    ClientParcelDetailView,
    ParcelTrackingView,
    ClientNotificationListView,
    NotificationDetailView,
    MarkNotificationAsReadView,
    MarkAllNotificationsAsReadView,
    PricingRuleListView,
    ParcelStatsView,
    ParcelDriverContactView,
    CalculatePriceView,
)

app_name = 'client'

urlpatterns = [
    # Client Profile
    path('profile/', ClientProfileView.as_view(), name='client-profile'),
    
    # Parcel Management
    path('parcels/', ClientParcelListView.as_view(), name='parcel-list'),
    path('parcels/create/', CreateParcelView.as_view(), name='parcel-create'),
    path('parcels/<int:id>/', ClientParcelDetailView.as_view(), name='parcel-detail'),
    path('parcels/<int:parcel_id>/track/', ParcelTrackingView.as_view(), name='parcel-track'),
    path('parcels/<int:parcel_id>/driver-contact/', ParcelDriverContactView.as_view(), name='parcel-driver-contact'),
    
    # Statistics
    path('stats/', ParcelStatsView.as_view(), name='parcel-stats'),
    
    # Notifications
    path('notifications/', ClientNotificationListView.as_view(), name='notification-list'),
    path('notifications/<int:id>/', NotificationDetailView.as_view(), name='notification-detail'),
    path('notifications/<int:notification_id>/mark-read/', MarkNotificationAsReadView.as_view(), name='notification-mark-read'),
    path('notifications/mark-all-read/', MarkAllNotificationsAsReadView.as_view(), name='notification-mark-all-read'),
    
    # Pricing Rules
    path('pricing-rules/', PricingRuleListView.as_view(), name='pricing-rules'),
    # Price calculator (returns computed price for given weight/distance)
    path('pricing/calculate/', CalculatePriceView.as_view(), name='pricing-calculate'),
]
