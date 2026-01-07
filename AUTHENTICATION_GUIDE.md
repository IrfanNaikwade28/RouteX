# Authentication Integration Guide

## ✅ Your authentication is now fully integrated!

### Current Setup

1. **Backend API Endpoints** (`/api/auth/`)
   - `/register/` - Register new clients
   - `/login/` - Login with any role (client, driver, admin)
   - `/token/refresh/` - Refresh JWT tokens

2. **Frontend Integration**
   - `AuthContext` manages authentication state
   - `api.ts` handles API calls with JWT tokens
   - Auto token refresh on 401 errors
   - Protected routes for each role

3. **Authentication Flow**
   - User logs in with email, password, and role
   - Backend validates credentials and role match
   - Returns JWT tokens (access + refresh)
   - Frontend stores tokens and user data in localStorage
   - Axios interceptor adds Bearer token to all requests
   - Auto-refreshes expired tokens

### How to Use

#### 1. Start the Backend Server

```bash
cd backend
python manage.py runserver
```

The server will run at `http://localhost:8000`

#### 2. Start the Frontend Server

```bash
cd frontend
npm run dev
# or
bun run dev
```

The app will run at `http://localhost:5173`

#### 3. Login with Different Roles

**For Client:**
1. Go to `/auth`
2. Select "Client" role
3. Click "Sign Up" to register a new client account
4. Or login with existing client credentials

**For Driver:**
1. Driver accounts must be created by admin first
2. Go to `/auth`
3. Select "Driver" role
4. Login with driver credentials

**For Admin:**
1. Admin accounts are system-created
2. Go to `/auth`
3. Select "Admin" role
4. Login with admin credentials

### Creating Test Users

#### Create Admin User (via Django shell):
```bash
cd backend
python manage.py shell
```

```python
from authapp.models import User
admin = User.objects.create_user(
    email='admin@example.com',
    password='admin123',
    full_name='Admin User',
    phone_number='+1234567890',
    role='admin',
    is_staff=True,
    is_superuser=True
)
```

#### Create Driver User (via Django shell):
```bash
cd backend
python manage.py shell
```

```python
from authapp.models import User
driver = User.objects.create_user(
    email='driver@example.com',
    password='driver123',
    full_name='Driver User',
    phone_number='+1234567891',
    role='driver'
)
```

#### Create Client User (via API or Frontend):
- Use the registration form at `/auth` with "Client" role selected
- Or use the API directly:

```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "email": "client@example.com",
    "password": "client123",
    "phone_number": "+1234567892",
    "role": "client"
  }'
```

### Features

✅ **Role-based authentication** - Login as client, driver, or admin
✅ **JWT tokens** - Secure authentication with access and refresh tokens
✅ **Auto token refresh** - Seamless token renewal on expiration
✅ **Protected routes** - Role-based access control
✅ **Persistent sessions** - Stay logged in across page refreshes
✅ **Error handling** - Clear error messages for invalid credentials

### API Endpoints

#### Register (Client only)
```
POST /api/auth/register/
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone_number": "+1234567890",
  "role": "client"
}
```

#### Login (All roles)
```
POST /api/auth/login/
{
  "email": "john@example.com",
  "password": "password123",
  "role": "client"
}
```

Response:
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "full_name": "John Doe",
    "phone_number": "+1234567890",
    "role": "client"
  },
  "tokens": {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
}
```

#### Refresh Token
```
POST /api/auth/token/refresh/
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Security Features

- ✅ Passwords are hashed with Django's built-in password hasher
- ✅ JWT tokens with configurable expiration (24 hours for access, 7 days for refresh)
- ✅ Role verification on login
- ✅ CORS configured for frontend domain
- ✅ Bearer token authentication on all protected endpoints

### Troubleshooting

**Issue: "Network error. Please check your connection."**
- Ensure backend server is running on `http://localhost:8000`
- Check that `.env` file exists in frontend folder with `VITE_API_URL=http://localhost:8000/api`
- Restart frontend dev server after creating `.env` file

**Issue: "Invalid credentials"**
- Verify email and password are correct
- Ensure the selected role matches the user's role in database
- Check if user account is active

**Issue: "Invalid role for this user"**
- The role you selected doesn't match the role assigned to this user
- Select the correct role for this account

**Issue: Frontend not reading .env file**
- Restart the Vite dev server: `Ctrl+C` then `npm run dev` again
- Ensure `.env` file is in the `frontend` folder (not `frontend/src`)

### Next Steps

1. ✅ Authentication is working
2. Now you can:
   - Test login with different roles
   - Create parcels (client dashboard)
   - Assign parcels to drivers (admin dashboard)
   - Track deliveries (driver dashboard)
   - Monitor all operations (admin dashboard)

### Environment Variables

Make sure `.env` file exists in `frontend/` folder:

```env
# Backend API URL
VITE_API_URL=http://localhost:8000/api
```

**Important:** After creating or modifying `.env`, restart the frontend dev server!
