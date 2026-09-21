import Cookies from "js-cookie";
import { getSharedLoginUrl } from "@/services/auth-navigation";

const AUTH_COOKIE_DOMAIN = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;
const cookieScope = {
  path: "/",
  ...(AUTH_COOKIE_DOMAIN ? { domain: AUTH_COOKIE_DOMAIN } : {}),
};

export function clearAdminSession(): void {
  Cookies.remove("accessToken", cookieScope);
  Cookies.remove("adminAccessToken", { path: "/" });
  Cookies.remove("adminName", { path: "/" });
  Cookies.remove("adminId", { path: "/" });
}

export function expireAdminSession(): void {
  clearAdminSession();

  if (
    typeof window !== "undefined" &&
    window.location.pathname.toLowerCase() !== "/login"
  ) {
    window.location.replace(getSharedLoginUrl());
  }
}
