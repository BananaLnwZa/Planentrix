/**
 * API Configuration
 */

// Get the base URL from environment variables
export const getApiBaseURL = (): string => {
  if (typeof window === "undefined") {
    return process.env.API_URL || "http://127.0.0.1:4000";
  }

  return process.env.NEXT_PUBLIC_API_URL || "/backend-api";
};

export const apiConfig = {
  baseURL: getApiBaseURL(),
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
};

// API Endpoints
export const apiEndpoints = {
  auth: {
    register: "/auth/register",
    login: "/auth/login",
    logout: "/auth/logout",
    deleteAccount: "/auth/me",
  },
  // Add more endpoint groups as needed
  // user: {
  //   profile: "/user/profile",
  //   update: "/user/update",
  // },
};
