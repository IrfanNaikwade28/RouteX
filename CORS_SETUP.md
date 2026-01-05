# CORS Configuration - Fixed ✅

## What Was The Problem?

**CORS Error:** `Access to XMLHttpRequest at 'http://localhost:8000/api/auth/register/' from origin 'http://localhost:8080' has been blocked by CORS policy`

This happens when a frontend application (running on one domain/port) tries to make requests to a backend API (running on a different domain/port). Browsers block these requests by default for security reasons unless the backend explicitly allows them.

## What Is CORS?

**CORS (Cross-Origin Resource Sharing)** is a security feature implemented by browsers that restricts web pages from making requests to a different domain than the one serving the web page.

- **Frontend:** `http://localhost:8080` (or 5173 for Vite)
- **Backend:** `http://localhost:8000`
- **Problem:** Different ports = Different origins = CORS restriction

## Solution Implemented

### Backend Changes (Django):

1. **Installed `django-cors-headers`** (already installed)
   ```bash
   pip install django-cors-headers
   ```

2. **Added to `INSTALLED_APPS`:**
   ```python
   'corsheaders',
   ```

3. **Added CORS middleware** (must be placed BEFORE `CommonMiddleware`):
   ```python
   'corsheaders.middleware.CorsMiddleware',
   ```

4. **Configured allowed origins:**
   ```python
   CORS_ALLOWED_ORIGINS = [
       'http://localhost:5173',  # Vite default
       'http://localhost:8080',  # Your frontend
       'http://localhost:3000',  # Common React port
       'http://127.0.0.1:5173',
       'http://127.0.0.1:8080',
       'http://127.0.0.1:3000',
   ]
   
   CORS_ALLOW_CREDENTIALS = True
   ```

### Frontend Setup:

✅ Already configured with proper API base URL in `.env`:
```env
VITE_API_URL=http://localhost:8000/api
```

## How To Test:

1. **Restart Django Backend:**
   ```bash
   cd backend
   python manage.py runserver
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Authentication:**
   - Open browser at `http://localhost:8080` (or the port shown by Vite)
   - Try to register or login
   - Check browser console - CORS error should be gone!

## What Happens Now?

✅ Backend sends `Access-Control-Allow-Origin` header with responses  
✅ Browser allows frontend to read the responses  
✅ Authentication requests work properly  
✅ JWT tokens are sent and received correctly  

## Common CORS Issues:

| Issue | Solution |
|-------|----------|
| Still getting CORS error | Restart Django server |
| Wrong port | Add your actual frontend port to `CORS_ALLOWED_ORIGINS` |
| Credentials not working | Ensure `CORS_ALLOW_CREDENTIALS = True` |
| Production issues | Use environment variables for allowed origins |

## Production Considerations:

For production, replace the hardcoded origins with environment variables:

```python
import os

CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
```

Then set in your production environment:
```
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## Security Note:

⚠️ **Never use `CORS_ALLOW_ALL_ORIGINS = True` in production!**  
Only allow specific, trusted origins.
