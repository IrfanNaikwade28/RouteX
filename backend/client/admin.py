from django.contrib import admin
from .models import Parcel, ParcelStatusHistory, Notification, PricingRule


@admin.register(PricingRule)
class PricingRuleAdmin(admin.ModelAdmin):
    """Admin interface for PricingRule model."""
    
    list_display = [
        'min_weight', 
        'max_weight', 
        'base_price', 
        'price_per_km', 
        'is_active',
        'created_at'
    ]
    list_filter = ['is_active', 'created_at']
    search_fields = ['min_weight', 'max_weight']
    ordering = ['min_weight']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Weight Range', {
            'fields': ('min_weight', 'max_weight')
        }),
        ('Pricing', {
            'fields': ('base_price', 'price_per_km')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class ParcelStatusHistoryInline(admin.TabularInline):
    """Inline admin for ParcelStatusHistory."""
    
    model = ParcelStatusHistory
    extra = 0
    readonly_fields = ['status', 'location', 'notes', 'created_by', 'created_at']
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Parcel)
class ParcelAdmin(admin.ModelAdmin):
    """Admin interface for Parcel model."""
    
    list_display = [
        'tracking_number',
        'client',
        'from_location',
        'to_location',
        'weight',
        'price',
        'current_status',
        'created_at'
    ]
    list_filter = ['current_status', 'created_at', 'updated_at']
    search_fields = [
        'tracking_number', 
        'client__email', 
        'client__full_name',
        'from_location',
        'to_location'
    ]
    readonly_fields = [
        'tracking_number',
        'price',
        'created_at',
        'updated_at'
    ]
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Client Information', {
            'fields': ('client', 'tracking_number')
        }),
        ('Location Details', {
            'fields': (
                'from_location',
                'to_location',
                'pickup_stop_id',
                'drop_stop_id'
            )
        }),
        ('Parcel Dimensions', {
            'fields': ('weight', 'height', 'width', 'breadth')
        }),
        ('Pricing & Distance', {
            'fields': ('distance_km', 'price')
        }),
        ('Status', {
            'fields': ('current_status',)
        }),
        ('Additional Information', {
            'fields': ('description', 'special_instructions'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [ParcelStatusHistoryInline]
    
    def save_model(self, request, obj, form, change):
        """Override save to recalculate price if weight or distance changes."""
        if change:  # If updating existing parcel
            old_obj = Parcel.objects.get(pk=obj.pk)
            if old_obj.weight != obj.weight or old_obj.distance_km != obj.distance_km:
                obj.calculate_price()
        super().save_model(request, obj, form, change)


@admin.register(ParcelStatusHistory)
class ParcelStatusHistoryAdmin(admin.ModelAdmin):
    """Admin interface for ParcelStatusHistory model."""
    
    list_display = [
        'parcel',
        'status',
        'location',
        'created_by',
        'created_at'
    ]
    list_filter = ['status', 'created_at']
    search_fields = [
        'parcel__tracking_number',
        'location',
        'notes'
    ]
    readonly_fields = ['created_at']
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Parcel Information', {
            'fields': ('parcel', 'status')
        }),
        ('Location & Notes', {
            'fields': ('location', 'notes')
        }),
        ('Created By', {
            'fields': ('created_by', 'created_at')
        }),
    )
    
    def save_model(self, request, obj, form, change):
        """Override save to update parcel's current status."""
        super().save_model(request, obj, form, change)
        
        # Update the parcel's current status
        parcel = obj.parcel
        parcel.current_status = obj.status
        parcel.save()
        
        # Create notification for status update
        if obj.status != 'pending':
            Notification.objects.create(
                client=parcel.client,
                parcel=parcel,
                notification_type='status_update',
                title=f'Parcel Status Updated: {obj.get_status_display()}',
                message=f'Your parcel {parcel.tracking_number} status has been updated to {obj.get_status_display()}.'
            )


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Admin interface for Notification model."""
    
    list_display = [
        'title',
        'client',
        'parcel',
        'notification_type',
        'is_read',
        'created_at'
    ]
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = [
        'title',
        'message',
        'client__email',
        'client__full_name',
        'parcel__tracking_number'
    ]
    readonly_fields = ['created_at']
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Recipient', {
            'fields': ('client', 'parcel')
        }),
        ('Notification Details', {
            'fields': ('notification_type', 'title', 'message')
        }),
        ('Status', {
            'fields': ('is_read',)
        }),
        ('Timestamp', {
            'fields': ('created_at',)
        }),
    )
    
    actions = ['mark_as_read', 'mark_as_unread']
    
    def mark_as_read(self, request, queryset):
        """Mark selected notifications as read."""
        updated = queryset.update(is_read=True)
        self.message_user(request, f'{updated} notification(s) marked as read.')
    mark_as_read.short_description = 'Mark selected notifications as read'
    
    def mark_as_unread(self, request, queryset):
        """Mark selected notifications as unread."""
        updated = queryset.update(is_read=False)
        self.message_user(request, f'{updated} notification(s) marked as unread.')
    mark_as_unread.short_description = 'Mark selected notifications as unread'
