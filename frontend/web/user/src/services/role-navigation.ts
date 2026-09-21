import type { AuthRole } from "@/interfaces/auth.interface";

const adminWebUrl =
  process.env.NEXT_PUBLIC_ADMIN_WEB_URL || "http://localhost:3001";

export const getRoleHomeUrl = (role: AuthRole): string | null => {
  if (role === "user") return "/Main";
  if (role === "university_staff") {
    return `${adminWebUrl.replace(/\/$/, "")}/Main`;
  }
  if (role === "instructor") {
    return `${adminWebUrl.replace(/\/$/, "")}/Instructor/Main`;
  }
  return null;
};

export const redirectToRoleHome = (role: AuthRole): boolean => {
  const destination = getRoleHomeUrl(role);
  if (!destination || typeof window === "undefined") return false;
  window.location.replace(destination);
  return true;
};
