
# RouteX 

A comprehensive delivery management platform with real-time tracking, role-based dashboards, and WebSocket-powered live updates.

---

## 📹 Demo Video

https://github.com/user-attachments/assets/7cace141-4a06-4308-b82d-d930e5dec332

---

## 📖 Overview

RouteX is a full-stack delivery management system designed to streamline logistics operations. It provides distinct interfaces for administrators, clients, and drivers, with real-time tracking capabilities powered by WebSockets and Redis.

### ✨ Key Features

- 🔐 **Role-Based Authentication**: Secure JWT-based authentication for Admin, Client, and Driver roles
- 📊 **Admin Dashboard**: Comprehensive management interface for drivers, parcels, and system overview
- 📦 **Client Portal**: Package tracking and delivery management for customers
- 🚗 **Driver Interface**: Route optimization and real-time location updates
- 🗺️ **Live Tracking**: Real-time GPS tracking with WebSocket integration
- 🎯 **Route Management**: Intelligent routing with pickup and drop-off optimization
- 📱 **Responsive Design**: Modern UI built with React and shadcn/ui components

---

## 🏗️ Architecture

### Backend Stack
- **Framework**: Django 5.2.9 with Django REST Framework
- **Real-time**: Channels + Daphne for WebSocket support
- **Cache**: Redis for session management and real-time data
- **Database**: SQLite (development) - easily switchable to PostgreSQL/MySQL
- **Authentication**: JWT with djangorestframework-simplejwt

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Maps**: Leaflet with routing capabilities
- **HTTP Client**: Axios

---

## 📁 Project Structure

```
RouteX/
├── backend/                    # Django backend application
│   ├── admin_dashboard/       # Admin management module
│   ├── authapp/               # Authentication & authorization
│   ├── client/                # Client portal API
│   ├── track_driver/          # Real-time tracking module
│   ├── config/                # Django settings & ASGI config
│   ├── db.sqlite3             # SQLite database
│   ├── manage.py              # Django management script
│   └── requirements.txt       # Python dependencies
│
└── frontend/                  # React frontend application
    ├── src/
    │   ├── admin/            # Admin dashboard components
    │   ├── client/           # Client portal components
    │   ├── driver/           # Driver interface components
    │   ├── auth/             # Authentication components
    │   ├── components/       # Shared UI components
    │   ├── hooks/            # Custom React hooks
    │   ├── sockets/          # WebSocket integration
    │   └── types/            # TypeScript type definitions
    └── package.json          # Node.js dependencies
```

---

## 🚀 Getting Started

### Prerequisites

- **Python**: 3.9 or higher
- **Node.js**: 18.x or higher (with npm/bun)
- **Redis**: 6.x or higher (for WebSocket support)

### Backend Setup

1. **Navigate to the backend directory**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # Linux/Mac
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run migrations**
   ```bash
   python manage.py migrate
   ```

5. **Create test users (optional)**
   ```bash
   python create_test_users.py
   ```

6. **Start Redis server**
   ```bash
   redis-server
   ```

7. **Start the development server with Daphne (ASGI)**
   ```bash
   python -m daphne -b 0.0.0.0 -p 8000 config.asgi:application
   ```

   Backend will be available at: `http://localhost:8000`

### Frontend Setup

1. **Navigate to the frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   bun run dev
   ```

   Frontend will be available at: `http://localhost:5173`

---

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/token/refresh/` - Refresh JWT token

### Admin Dashboard
- `GET /api/admin/dashboard/` - Get dashboard statistics
- `GET /api/admin/drivers/` - List all drivers
- `POST /api/admin/drivers/` - Create new driver
- `GET /api/admin/parcels/` - List all parcels

### Client Portal
- `GET /api/client/parcels/` - List client parcels
- `POST /api/client/parcels/` - Create new parcel
- `GET /api/client/parcels/{id}/track/` - Track specific parcel

### Driver Tracking
- `WS /ws/driver/location/` - WebSocket for real-time location updates

---

## 🧪 Testing

### Backend Tests
```bash
cd backend

# Authentication tests
python test_auth.py

# Client API tests
python test_client_api.py

# Tracking tests
python test_tracking_simple.py
python test_tracking_socket.py
```

### Frontend Tests
```bash
cd frontend
npm run lint
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Database (Optional - defaults to SQLite)
# DB_ENGINE=django.db.backends.postgresql
# DB_NAME=routex_db
# DB_USER=your_db_user
# DB_PASSWORD=your_db_password
# DB_HOST=localhost
# DB_PORT=5432
```

---

## 👥 User Roles

### 1. **Admin**
- Manage drivers and their assignments
- View all parcels and delivery status
- Access system-wide analytics
- Monitor real-time driver locations

### 2. **Client**
- Create and track parcel deliveries
- View delivery history
- Get real-time updates on shipments
- Manage delivery preferences

### 3. **Driver**
- View assigned delivery routes
- Update location in real-time
- Update parcel status (picked up, in transit, delivered)
- Navigate optimized routes

---

## 🛠️ Built With

### Backend Technologies
- [Django](https://www.djangoproject.com/) - Web framework
- [Django REST Framework](https://www.django-rest-framework.org/) - REST API toolkit
- [Django Channels](https://channels.readthedocs.io/) - WebSocket support
- [Redis](https://redis.io/) - Caching and message broker
- [Daphne](https://github.com/django/daphne) - ASGI server

### Frontend Technologies
- [React](https://react.dev/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [TanStack Query](https://tanstack.com/query/) - Data fetching
- [Leaflet](https://leafletjs.com/) - Interactive maps
- [Axios](https://axios-http.com/) - HTTP client

---

## 📝 Development Scripts

### Backend
```bash
# Run development server (HTTP only)
python manage.py runserver

# Run ASGI server with WebSocket support
python -m daphne config.asgi:application

# Create superuser
python manage.py createsuperuser

# Make migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create test users
python create_test_users.py
```

### Frontend
```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

---

## 💻 Developers

- **Irfan Naikwade** - Frontend Developer
- **Sandesh Pol** - Backend Developer

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---
