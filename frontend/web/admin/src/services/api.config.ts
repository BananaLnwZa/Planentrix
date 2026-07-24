const getAdminApiBaseUrl = (): string => {
  const baseUrl =
    typeof window === "undefined"
      ? process.env.ADMIN_API_URL ||
        process.env.NEXT_PUBLIC_ADMIN_API_URL ||
        "http://localhost:4100"
      : process.env.NEXT_PUBLIC_ADMIN_API_URL || "http://localhost:4100";

  return baseUrl.replace(/\/$/, "");
};

export const apiConfig = {
  baseURL: getAdminApiBaseUrl(),
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
  },
};

export const apiEndpoints = {
  auth: {
    register: "/admin/auth/register",
    login: "/admin/auth/login",
    logout: "/admin/auth/logout",
  },
} as const;
