import Cookies from "js-cookie";

export function clearAdminSession(): void {
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
    window.location.replace("/LogIn");
  }
}
