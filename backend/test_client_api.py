"""
Test script for Client API endpoints
This script demonstrates how to use the client API endpoints
"""

import requests
import json

# Base URL
BASE_URL = "http://localhost:8000/api"

# Test credentials (you'll need to create a user first)
TEST_USER = {
    "email": "testclient@example.com",
    "password": "testpass123",
    "full_name": "Test Client",
    "phone_number": "+1234567890"
}


def print_response(title, response):
    """Pretty print API response."""
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}")
    print(f"Status Code: {response.status_code}")
    try:
        print(f"Response:\n{json.dumps(response.json(), indent=2)}")
    except:
        print(f"Response: {response.text}")
    print(f"{'='*60}\n")


def test_client_api():
    """Test all client API endpoints."""
    
    # 1. Register a new client
    print("\n1. REGISTERING NEW CLIENT")
    register_response = requests.post(
        f"{BASE_URL}/auth/register/",
        json=TEST_USER
    )
    print_response("Register Response", register_response)
    
    # 2. Login to get JWT token
    print("\n2. LOGGING IN")
    login_response = requests.post(
        f"{BASE_URL}/auth/login/",
        json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        }
    )
    print_response("Login Response", login_response)
    
    if login_response.status_code != 200:
        print("Login failed. Exiting...")
        return
    
    # Get access token
    access_token = login_response.json().get("access")
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # 3. Get client profile
    print("\n3. GETTING CLIENT PROFILE")
    profile_response = requests.get(
        f"{BASE_URL}/client/profile/",
        headers=headers
    )
    print_response("Profile Response", profile_response)
    
    # 4. Get pricing rules
    print("\n4. GETTING PRICING RULES")
    pricing_response = requests.get(
        f"{BASE_URL}/client/pricing-rules/",
        headers=headers
    )
    print_response("Pricing Rules Response", pricing_response)
    
    # 5. Create a parcel
    print("\n5. CREATING A PARCEL")
    parcel_data = {
        "from_location": "123 Main St, New York, NY",
        "to_location": "456 Oak Ave, Los Angeles, CA",
        "weight": 5.5,
        "height": 30.0,
        "width": 20.0,
        "breadth": 15.0,
        "distance_km": 450.0,
        "description": "Electronics package",
        "special_instructions": "Handle with care - fragile items"
    }
    create_parcel_response = requests.post(
        f"{BASE_URL}/client/parcels/create/",
        json=parcel_data,
        headers=headers
    )
    print_response("Create Parcel Response", create_parcel_response)
    
    if create_parcel_response.status_code != 201:
        print("Parcel creation failed. Continuing with other tests...")
        parcel_id = None
    else:
        parcel_id = create_parcel_response.json().get("id")
    
    # 6. List all parcels
    print("\n6. LISTING ALL PARCELS")
    list_parcels_response = requests.get(
        f"{BASE_URL}/client/parcels/",
        headers=headers
    )
    print_response("List Parcels Response", list_parcels_response)
    
    # 7. Get parcel details
    if parcel_id:
        print(f"\n7. GETTING PARCEL DETAILS (ID: {parcel_id})")
        parcel_detail_response = requests.get(
            f"{BASE_URL}/client/parcels/{parcel_id}/",
            headers=headers
        )
        print_response("Parcel Detail Response", parcel_detail_response)
        
        # 8. Track parcel
        print(f"\n8. TRACKING PARCEL (ID: {parcel_id})")
        track_response = requests.get(
            f"{BASE_URL}/client/parcels/{parcel_id}/track/",
            headers=headers
        )
        print_response("Track Parcel Response", track_response)
    
    # 9. Get notifications
    print("\n9. GETTING NOTIFICATIONS")
    notifications_response = requests.get(
        f"{BASE_URL}/client/notifications/",
        headers=headers
    )
    print_response("Notifications Response", notifications_response)
    
    # 10. Get parcel statistics
    print("\n10. GETTING PARCEL STATISTICS")
    stats_response = requests.get(
        f"{BASE_URL}/client/stats/",
        headers=headers
    )
    print_response("Statistics Response", stats_response)
    
    # 11. Mark all notifications as read
    print("\n11. MARKING ALL NOTIFICATIONS AS READ")
    mark_read_response = requests.post(
        f"{BASE_URL}/client/notifications/mark-all-read/",
        headers=headers
    )
    print_response("Mark All Read Response", mark_read_response)
    
    # 12. Filter parcels by status
    print("\n12. FILTERING PARCELS BY STATUS (pending)")
    filter_response = requests.get(
        f"{BASE_URL}/client/parcels/?status=pending",
        headers=headers
    )
    print_response("Filter Parcels Response", filter_response)
    
    # 13. Search parcels
    if parcel_id:
        tracking_number = create_parcel_response.json().get("tracking_number")
        print(f"\n13. SEARCHING PARCELS (tracking: {tracking_number})")
        search_response = requests.get(
            f"{BASE_URL}/client/parcels/?search={tracking_number}",
            headers=headers
        )
        print_response("Search Parcels Response", search_response)
    
    print("\n" + "="*60)
    print("ALL TESTS COMPLETED!")
    print("="*60)


if __name__ == "__main__":
    print("="*60)
    print("CLIENT API TEST SCRIPT")
    print("="*60)
    print("\nMake sure the Django server is running on http://localhost:8000")
    print("Press Ctrl+C to cancel, or Enter to continue...")
    
    try:
        input()
        test_client_api()
    except KeyboardInterrupt:
        print("\n\nTest cancelled by user.")
