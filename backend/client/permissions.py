from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner of the object.
        return obj == request.user


class IsParcelOwner(permissions.BasePermission):
    """
    Custom permission to only allow owners of a parcel to view/edit it.
    """
    
    def has_object_permission(self, request, view, obj):
        # Check if the parcel belongs to the authenticated user
        return obj.client == request.user


class IsNotificationOwner(permissions.BasePermission):
    """
    Custom permission to only allow owners of a notification to view/edit it.
    """
    
    def has_object_permission(self, request, view, obj):
        # Check if the notification belongs to the authenticated user
        return obj.client == request.user
