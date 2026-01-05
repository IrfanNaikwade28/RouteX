# Authentication API Integration

This document describes the integration between the frontend and backend authentication APIs.

## Backend API Endpoints

The backend provides the following authentication endpoints:

- **POST** `/api/auth/register/` - Register a new client
- **POST** `/api/auth/login/` - Login an existing client
- **POST** `/api/auth/token/refresh/` - Refresh JWT access token
- **GET** `/api/auth/protected/` - Example protected endpoint

## Frontend Implementation

### API Service (`src/lib/api.ts`)

The API service provides:
- Axios instance configured with base URL
- Request interceptor to add JWT tokens to requests
- Response interceptor to handle token refresh automatically
- Authentication API methods (login, register, logout)

### AuthContext (`src/auth/AuthContext.tsx`)

The AuthContext has been updated to:
- Call real backend APIs instead of using mock data
- Store JWT tokens in localStorage
- Map backend Client model to frontend User interface
- Handle authentication errors properly
- Include loading state for better UX

## Environment Configuration

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:8000/api
```

## Usage

### Login
```typescript
const { login } = useAuth();
const result = await login(email, password, 'client');
if (result.success) {
  // Login successful
} else {
  // Handle error: result.error
}
```

### Signup
```typescript
const { signup } = useAuth();
const result = await signup(name, email, password, 'client', phone);
if (result.success) {
  // Signup successful
} else {
  // Handle error: result.error
}
```

### Logout
```typescript
const { logout } = useAuth();
logout();
```

## Token Management

- JWT access and refresh tokens are stored in localStorage
- Access token is automatically added to all API requests
- When access token expires, the refresh token is used automatically
- If refresh fails, user is redirected to login

## Data Mapping

Backend Client model → Frontend User interface:

| Backend Field | Frontend Field |
|--------------|----------------|
| id           | id             |
| email        | email          |
| full_name    | name           |
| phone_number | phone          |
| -            | role (hardcoded to 'client') |

## Notes

- Currently, only client registration is supported by the backend
- Role is hardcoded to 'client' in the frontend mapping
- Driver and admin authentication will require separate backend endpoints
- Phone number is required for registration

## Dependencies

- axios: HTTP client for making API requests
- react: Context API for state management

## Security

- Passwords are never stored in localStorage
- JWT tokens are stored securely in localStorage
- Tokens are automatically refreshed before expiration
- Failed refresh attempts clear all auth data and redirect to login
