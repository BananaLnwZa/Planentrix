import type { AuthRole } from "@/interfaces/auth.interface";

const getAdminWebUrl = () => {
  if (process.env.NEXT_PUBLIC_ADMIN_WEB_URL) {
    return process.env.NEXT_PUBLIC_ADMIN_WEB_URL;
  }
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  return "http://localhost:3001";
};

export const getRoleHomeUrl = (role: AuthRole): string | null => {
  if (role === "user") return "/Main";
  if (role === "university_staff") {
    return `${getAdminWebUrl().replace(/\/$/, "")}/Main`;
  }
  if (role === "instructor") {
    return `${getAdminWebUrl().replace(/\/$/, "")}/Instructor/Main`;
  }
  return null;
};

export const redirectToRoleHome = (role: AuthRole): boolean => {
  const destination = getRoleHomeUrl(role);
  if (!destination || typeof window === "undefined") return false;
  window.location.replace(destination);
  return true;
};
