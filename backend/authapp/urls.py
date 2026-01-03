from django.urls import path
from .views import ClientRegistrationView, ClientLoginView

app_name = 'authapp'

urlpatterns = [
    path('register/', ClientRegistrationView.as_view(), name='register'),
    path('login/', ClientLoginView.as_view(), name='login'),
]
