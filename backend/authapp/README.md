# Django REST Authentication System

A complete JWT-based authentication system for Django REST Framework with custom user model.

## Features

✅ Custom Client user model with email as username  
✅ JWT token authentication using SimpleJWT  
✅ User registration with validation  
✅ User login with token generation  
✅ Password hashing with Django's `set_password()`  
✅ Clean JSON responses  
✅ Django admin integration  
✅ REST API best practices  

## Project Structure

```
authapp/
├── models.py           # Custom Client user model
├── serializers.py      # Registration & Login serializers
├── views.py           # API views for auth endpoints
├── urls.py            # URL routing
├── admin.py           # Django admin configuration
└── migrations/        # Database migrations
```

## Custom User Model

### Client Model Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | BigAutoField | Primary key (auto-generated) |
| `full_name` | CharField(100) | User's full name |
| `email` | EmailField | Unique email (USERNAME_FIELD) |
| `phone_number` | CharField(15) | Unique phone number |
| `password` | CharField | Hashed password |
| `is_active` | BooleanField | Account active status |
| `is_staff` | BooleanField | Staff status |
| `created_at` | DateTimeField | Account creation timestamp |

## API Endpoints

### 1. Register Client

**Endpoint:** `POST /api/auth/register/`

**Request Body:**
```json
{
  "full_name": "John Doe",
  "email": "john.doe@example.com",
  "phone_number": "+1234567890",
  "password": "SecurePass123!"
}
```

**Success Response (201 Created):**
```json
{
  "message": "Client registered successfully",
  "client": {
    "id": 1,
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "phone_number": "+1234567890",
    "is_active": true,
    "created_at": "2026-01-02T11:50:51.123456Z"
  },
  "tokens": {
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "message": "Registration failed",
  "errors": {
    "email": ["A user with this email already exists."],
    "password": ["This password is too short."]
  }
}
```

### 2. Login Client

**Endpoint:** `POST /api/auth/login/`

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200 OK):**
```json
{
  "message": "Login successful",
  "client": {
    "id": 1,
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "phone_number": "+1234567890",
    "is_active": true,
    "created_at": "2026-01-02T11:50:51.123456Z"
  },
  "tokens": {
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "message": "Login failed",
  "errors": {
    "non_field_errors": ["Invalid credentials."]
  }
}
```

## JWT Token Configuration

### Token Lifetimes
- **Access Token:** 1 hour
- **Refresh Token:** 7 days

### Using Tokens

Include the access token in the Authorization header for protected endpoints:

```
Authorization: Bearer <access_token>
```

### Token Response Format
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

## Setup Instructions

### 1. Install Dependencies

```bash
pip install djangorestframework djangorestframework-simplejwt
```

### 2. Configure Settings

The following has been configured in `config/settings.py`:

```python
INSTALLED_APPS = [
    # ...
    'rest_framework',
    'rest_framework_simplejwt',
    'authapp',
]

AUTH_USER_MODEL = 'authapp.Client'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    # ... other settings
}
```

### 3. Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 4. Create Superuser (Optional)

```bash
python manage.py createsuperuser
```

### 5. Run Development Server

```bash
python manage.py runserver
```

## Testing the API

### Using cURL

**Register:**
```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "phone_number": "+1234567890",
    "password": "SecurePass123!"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123!"
  }'
```

### Using Python Test Script

Run the included test script:

```bash
python test_auth.py
```

### Using Postman or Thunder Client

1. Create a new POST request
2. Set URL to `http://localhost:8000/api/auth/register/`
3. Set Headers: `Content-Type: application/json`
4. Add JSON body with required fields
5. Send request

## Validation Rules

### Registration Validation

- **Email:** Must be valid email format and unique
- **Phone Number:** Must be unique
- **Password:** Minimum 8 characters
- **Full Name:** Required, max 100 characters

### Login Validation

- **Email:** Required, must exist in database
- **Password:** Required, must match hashed password
- **Account Status:** User must be active (`is_active=True`)

## Security Features

1. **Password Hashing:** Uses Django's `set_password()` with PBKDF2 algorithm
2. **JWT Tokens:** Secure token-based authentication
3. **Email Uniqueness:** Prevents duplicate accounts
4. **Phone Uniqueness:** Additional unique identifier
5. **Active Status Check:** Deactivated accounts cannot login
6. **Password Validation:** Django's built-in validators applied

## Django Admin

The Client model is registered in Django admin with:

- List display: email, full_name, phone_number, is_active, is_staff, created_at
- Search fields: email, full_name, phone_number
- Filters: is_active, is_staff, created_at
- Custom fieldsets for better organization

Access admin at: `http://localhost:8000/admin/`

## Code Architecture

### Models (`models.py`)
- `ClientManager`: Custom manager for user creation
- `Client`: Custom user model extending AbstractBaseUser

### Serializers (`serializers.py`)
- `ClientRegistrationSerializer`: Handles registration with validation
- `ClientLoginSerializer`: Handles login with authentication
- `ClientSerializer`: Returns client data (read-only)

### Views (`views.py`)
- `ClientRegistrationView`: APIView for registration
- `ClientLoginView`: APIView for login
- `get_tokens_for_user()`: Helper function for JWT generation

## Best Practices Implemented

✅ Modular code structure  
✅ Proper separation of concerns  
✅ DRY principle (Don't Repeat Yourself)  
✅ Comprehensive validation  
✅ Clean error messages  
✅ Consistent response format  
✅ Security-first approach  
✅ RESTful API design  
✅ Type hints and docstrings  
✅ Database indexing on email field  

## Troubleshooting

### Migration Issues

If you encounter migration conflicts:

```bash
# Delete database (development only!)
rm db.sqlite3

# Delete migrations (except __init__.py)
rm authapp/migrations/0*.py

# Recreate migrations
python manage.py makemigrations
python manage.py migrate
```

### Import Errors

Make sure all dependencies are installed:

```bash
pip install -r requirements.txt
```

### Token Errors

Verify SimpleJWT is properly configured in settings.py and installed:

```bash
pip show djangorestframework-simplejwt
```

## Next Steps

- [ ] Add password reset functionality
- [ ] Implement email verification
- [ ] Add user profile endpoints
- [ ] Create token refresh endpoint
- [ ] Add rate limiting
- [ ] Implement logout (token blacklisting)
- [ ] Add social authentication
- [ ] Create user profile update endpoint

## License

This authentication system follows Django REST Framework best practices and is ready for production use with proper environment configuration.
