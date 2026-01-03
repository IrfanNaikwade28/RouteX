"""
Test script for Django REST Authentication System
This script tests the registration and login endpoints.
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/auth"

def print_response(title, response):
    """Pretty print API response."""
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}")
    print(f"Status Code: {response.status_code}")
    print(f"Response:")
    print(json.dumps(response.json(), indent=2))
    print(f"{'='*60}\n")

def test_registration():
    """Test client registration endpoint."""
    url = f"{BASE_URL}/register/"
    data = {
        "full_name": "John Doe",
        "email": "john.doe@example.com",
        "phone_number": "+1234567890",
        "password": "SecurePass123!"
    }
    
    response = requests.post(url, json=data)
    print_response("CLIENT REGISTRATION TEST", response)
    
    if response.status_code == 201:
        return response.json()
    return None

def test_login(email, password):
    """Test client login endpoint."""
    url = f"{BASE_URL}/login/"
    data = {
        "email": email,
        "password": password
    }
    
    response = requests.post(url, json=data)
    print_response("CLIENT LOGIN TEST", response)
    
    if response.status_code == 200:
        return response.json()
    return None

def test_duplicate_registration():
    """Test duplicate registration (should fail)."""
    url = f"{BASE_URL}/register/"
    data = {
        "full_name": "John Doe",
        "email": "john.doe@example.com",
        "phone_number": "+1234567890",
        "password": "SecurePass123!"
    }
    
    response = requests.post(url, json=data)
    print_response("DUPLICATE REGISTRATION TEST (Should Fail)", response)

def test_invalid_login():
    """Test login with invalid credentials."""
    url = f"{BASE_URL}/login/"
    data = {
        "email": "john.doe@example.com",
        "password": "WrongPassword123!"
    }
    
    response = requests.post(url, json=data)
    print_response("INVALID LOGIN TEST (Should Fail)", response)

def test_registration_validation():
    """Test registration with missing fields."""
    url = f"{BASE_URL}/register/"
    data = {
        "full_name": "Jane Doe",
        "email": "invalid-email",  # Invalid email format
        "password": "short"  # Too short password
    }
    
    response = requests.post(url, json=data)
    print_response("VALIDATION TEST (Should Fail)", response)

def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("DJANGO REST AUTHENTICATION SYSTEM - TEST SUITE")
    print("="*60)
    
    # Test 1: Register a new client
    print("\n[TEST 1] Registering a new client...")
    registration_result = test_registration()
    
    if registration_result:
        tokens = registration_result.get('tokens', {})
        print(f"\n✓ Registration successful!")
        print(f"Access Token: {tokens.get('access', 'N/A')[:50]}...")
        print(f"Refresh Token: {tokens.get('refresh', 'N/A')[:50]}...")
    
    # Test 2: Login with registered credentials
    print("\n[TEST 2] Logging in with registered credentials...")
    login_result = test_login("john.doe@example.com", "SecurePass123!")
    
    if login_result:
        print(f"\n✓ Login successful!")
    
    # Test 3: Duplicate registration
    print("\n[TEST 3] Attempting duplicate registration...")
    test_duplicate_registration()
    
    # Test 4: Invalid login
    print("\n[TEST 4] Attempting login with wrong password...")
    test_invalid_login()
    
    # Test 5: Validation errors
    print("\n[TEST 5] Testing validation errors...")
    test_registration_validation()
    
    print("\n" + "="*60)
    print("TEST SUITE COMPLETED")
    print("="*60 + "\n")

if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Could not connect to the server.")
        print("Please make sure the Django development server is running:")
        print("  python manage.py runserver")
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
