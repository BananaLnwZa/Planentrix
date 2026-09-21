/**
 * API Configuration
 */

// Get the base URL from environment variables
const getBaseURL = (): string => {
  if (typeof window === "undefined") {
    // Server-side
    return process.env.API_URL || "http://localhost:4000";
  }

  // Client-side
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
};

export const apiConfig = {
  baseURL: getBaseURL(),
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
