from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('api/auth/', include('authapp.urls')),
    path('api/client/', include('client.urls')),
    path('api/driver/', include('track_driver.urls')),
    path('api/admin/', include('admin_dashboard.urls')),
]
