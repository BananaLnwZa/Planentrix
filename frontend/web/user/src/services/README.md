# Frontend Authentication Service Documentation

This directory contains all authentication-related interfaces, services, and stores for the user web application.

## 📁 Structure

```
src/
├── interfaces/
│   └── auth.interface.ts          # TypeScript interfaces for Auth API
├── services/
│   ├── auth.service.ts            # Auth API client service
│   ├── auth.store.ts              # Zustand auth state store
│   └── api.config.ts              # API configuration
└── .env.example                   # Environment variables template
```

## 🔧 Setup

### 1. Environment Variables

Create a `.env.local` file in the `frontend/web/user` directory:

```bash
cp .env.example .env.local
```

Update the `NEXT_PUBLIC_API_URL` to match your backend URL:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## 📚 Available Interfaces

### `auth.interface.ts`

#### Request/Response Interfaces:

- **RegisterRequest** - User registration data
- **LoginRequest/LoginResponse** - Login credentials and response
- **RefreshTokenRequest/RefreshTokenResponse** - Token refresh
- **LogoutRequest/LogoutResponse** - Logout operation
- **DeleteAccountRequest/DeleteAccountResponse** - Account deletion
- **ApiResponse<T>** - Generic API response wrapper
- **ApiErrorResponse** - Error response structure
- **AuthState** - Auth store state interface
- **AuthUser** - User information in auth state

## 🚀 Usage Examples

### 1. Using Auth Service Directly

```typescript
import authService from "@/services/auth.service";

// Register
try {
  const result = await authService.register({
    user_name: "john_doe",
    user_password: "SecurePass123!",
    user_birthdate: "1990-01-01",
    user_gender: "male",
  });
  console.log(result.message);
} catch (error) {
  console.error("Registration failed:", error);
}

// Login
try {
  const response = await authService.login({
    user_name: "john_doe",
    user_password: "SecurePass123!",
  });
  console.log("Logged in:", response);
} catch (error) {
  console.error("Login failed:", error);
}

// Logout
await authService.logout();

// Check authentication status
if (authService.isAuthenticated()) {
  console.log("User is authenticated");
}

// Delete account
await authService.deleteAccount();
```

### 2. Using Zustand Auth Store (Recommended)

```typescript
"use client";

import { useAuthStore } from "@/services/auth.store";

export function LoginComponent() {
  const { login, isLoading, error, isAuthenticated } = useAuthStore();

  const handleLogin = async () => {
    try {
      await login("john_doe", "SecurePass123!");
      console.log("Login successful!");
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  return (
    <div>
      <button onClick={handleLogin} disabled={isLoading}>
        {isLoading ? "Logging in..." : "Login"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {isAuthenticated && <p>You are logged in!</p>}
    </div>
  );
}
```

### 3. Using Auth Store in Components

```typescript
"use client";

import { useAuthStore } from "@/services/auth.store";

export function UserProfile() {
  const { user, isAuthenticated, logout } = useAuthStore();

  if (!isAuthenticated) {
    return <div>Please login first</div>;
  }

  return (
    <div>
      <h1>Welcome, {user?.username}</h1>
      <p>User ID: {user?.userId}</p>
      <p>Role: {user?.role}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### 4. Protected Route Component

```typescript
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/services/auth.store";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuthStatus } = useAuthStore();

  useEffect(() => {
    checkAuthStatus();

    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router, checkAuthStatus]);

  if (isLoading || !isAuthenticated) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}
```

### 5. Registration Form with Zod Validation

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/services/auth.store";

const registerSchema = z.object({
  user_name: z.string().min(3, "Username must be at least 3 characters"),
  user_password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Must contain a letter")
    .regex(/[\W_]/, "Must contain a special character"),
  user_birthdate: z.string().optional(),
  user_gender: z.enum(["male", "female", "other"]).optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const { register: authRegister, isLoading, error } = useAuthStore();

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await authRegister(
        data.user_name,
        data.user_password,
        data.user_birthdate,
        data.user_gender
      );
      console.log("Registration successful!");
    } catch (err) {
      console.error("Registration failed:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Registering..." : "Register"}
      </button>
    </form>
  );
}
```

## 🔐 Security Features

### 1. Automatic Token Management
- Access tokens are stored securely in HTTP-only cookies
- Automatic token refresh on expiration
- Invalid tokens trigger automatic logout

### 2. Request/Response Interceptors
- Automatically adds Authorization header to all requests
- Handles 401 errors with token refresh
- Redirects to login on failed refresh

### 3. Error Handling
- Standardized error responses
- Clear error messages passed to store
- Failed requests don't leave orphaned data

## 📋 API Endpoints

All endpoints are relative to the backend base URL:

```
POST   /user/auth/register         # Create new account
POST   /user/auth/login            # Login
POST   /user/auth/refresh-token    # Get new access token
POST   /user/auth/logout           # Logout (clears refresh token)
DELETE /user/auth/me               # Delete account
```

## 🛠️ Best Practices

1. **Always use the Zustand store** for component-level state management
2. **Use the service directly** only for non-component logic (utils, helpers)
3. **Wrap sensitive operations** in try-catch blocks
4. **Check `isLoading` state** before showing results
5. **Handle `error` state** in UI to show user feedback
6. **Call `checkAuthStatus()`** on app initialization
7. **Use the ProtectedRoute** component for private routes

## 🔄 Token Refresh Flow

1. User logs in → `accessToken` stored (24h expiry for web)
2. Request made → Interceptor adds `Authorization: Bearer {token}`
3. Token expires → 401 response triggers auto-refresh
4. New token obtained → Original request retried
5. Refresh fails → Automatic logout, redirect to login

## 📦 Dependencies

- `axios` - HTTP client
- `zustand` - State management
- `js-cookie` - Cookie management
- `react-hook-form` - Form handling
- `zod` - Schema validation

## 🚨 Troubleshooting

### Issue: "NEXT_PUBLIC_API_URL not set"
**Solution:** Create `.env.local` file with `NEXT_PUBLIC_API_URL` variable

### Issue: CORS errors
**Solution:** Ensure backend has CORS enabled for your frontend URL

### Issue: Token not persisting
**Solution:** Check browser cookie settings, ensure `Secure` flag works in your environment

### Issue: "Invalid username or password" after registration
**Solution:** Wait a moment for database to sync, or check backend logs for validation errors

## 📝 Next Steps

1. Create additional service files for other API features (user profile, schedules, etc.)
2. Use the same pattern: interface → service → store
3. Reference the auth service/store pattern for consistency
