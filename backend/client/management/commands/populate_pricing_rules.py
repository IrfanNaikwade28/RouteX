from django.core.management.base import BaseCommand
from client.models import PricingRule
from decimal import Decimal


class Command(BaseCommand):
    help = 'Populate database with sample pricing rules'

    def handle(self, *args, **kwargs):
        """Create sample pricing rules."""
        
        self.stdout.write(self.style.WARNING('Creating sample pricing rules...'))
        
        # Clear existing pricing rules
        PricingRule.objects.all().delete()
        
        # Define pricing rules
        pricing_rules = [
            {
                'min_weight': Decimal('0.01'),
                'max_weight': Decimal('5.00'),
                'base_price': Decimal('50.00'),
                'price_per_km': Decimal('5.00'),
                'is_active': True
            },
            {
                'min_weight': Decimal('5.01'),
                'max_weight': Decimal('10.00'),
                'base_price': Decimal('100.00'),
                'price_per_km': Decimal('8.00'),
                'is_active': True
            },
            {
                'min_weight': Decimal('10.01'),
                'max_weight': Decimal('20.00'),
                'base_price': Decimal('200.00'),
                'price_per_km': Decimal('12.00'),
                'is_active': True
            },
            {
                'min_weight': Decimal('20.01'),
                'max_weight': Decimal('50.00'),
                'base_price': Decimal('400.00'),
                'price_per_km': Decimal('15.00'),
                'is_active': True
            },
            {
                'min_weight': Decimal('50.01'),
                'max_weight': Decimal('100.00'),
                'base_price': Decimal('800.00'),
                'price_per_km': Decimal('20.00'),
                'is_active': True
            },
        ]
        
        # Create pricing rules
        created_count = 0
        for rule_data in pricing_rules:
            rule = PricingRule.objects.create(**rule_data)
            created_count += 1
            self.stdout.write(
                self.style.SUCCESS(
                    f'Created: {rule.min_weight}kg - {rule.max_weight}kg: '
                    f'₹{rule.base_price} + ₹{rule.price_per_km}/km'
                )
            )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nSuccessfully created {created_count} pricing rules!'
            )
        )
