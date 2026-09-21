import Cookies from "js-cookie";
import type { AuthRole, AuthUser } from "@/interfaces/auth.interface";

const ACCESS_TOKEN_COOKIE = "accessToken";
const AUTH_STORE_KEY = "auth-store";
const EXPIRY_CLOCK_SKEW_SECONDS = 5;
const AUTH_COOKIE_DOMAIN = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;

const cookieScope = {
  path: "/",
  ...(AUTH_COOKIE_DOMAIN ? { domain: AUTH_COOKIE_DOMAIN } : {}),
};

interface AccessTokenPayload {
  id?: unknown;
  role?: unknown;
  exp?: unknown;
}

const isAuthRole = (value: unknown): value is AuthRole =>
  value === "user" ||
  value === "instructor" ||
  value === "university_staff";

export interface AuthSession {
  token: string;
  user: AuthUser;
  expiresAt: Date;
}

const decodeAccessToken = (token: string): AccessTokenPayload | null => {
  try {
    const encodedPayload = token.split(".")[1];
    if (!encodedPayload) return null;

    const normalizedPayload = encodedPayload
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      "="
    );

    return JSON.parse(globalThis.atob(paddedPayload)) as AccessTokenPayload;
  } catch {
    return null;
  }
};

export const readAuthSession = (token: string): AuthSession | null => {
  const payload = decodeAccessToken(token);
  const userId = Number(payload?.id);
  const expiresAtSeconds = Number(payload?.exp);
  const role = payload?.role;
  const nowSeconds = Date.now() / 1000;

  if (
    !Number.isInteger(userId) ||
    userId <= 0 ||
    !Number.isFinite(expiresAtSeconds) ||
    expiresAtSeconds <= nowSeconds + EXPIRY_CLOCK_SKEW_SECONDS ||
    !isAuthRole(role)
  ) {
    return null;
  }

  return {
    token,
    user: { userId, role },
    expiresAt: new Date(expiresAtSeconds * 1000),
  };
};

export const clearStoredAuth = (): void => {
  Cookies.remove(ACCESS_TOKEN_COOKIE, cookieScope);
  Cookies.remove("adminAccessToken", { path: "/" });

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_STORE_KEY);
  }
};

export const getStoredAuthSession = (): AuthSession | null => {
  const token = Cookies.get(ACCESS_TOKEN_COOKIE);
  if (!token) return null;

  const session = readAuthSession(token);
  if (!session) clearStoredAuth();
  return session;
};

export const storeAccessToken = (token: string): AuthSession => {
  const session = readAuthSession(token);
  if (!session) {
    clearStoredAuth();
    throw new Error("โทเคนเข้าสู่ระบบไม่ถูกต้องหรือหมดอายุแล้ว");
  }

  Cookies.set(ACCESS_TOKEN_COOKIE, token, {
    expires: session.expiresAt,
    ...cookieScope,
    secure:
      typeof window !== "undefined" && window.location.protocol === "https:",
    sameSite: "strict",
  });

  return session;
};

export const expireAuthSession = (): void => {
  clearStoredAuth();

  if (
    typeof window !== "undefined" &&
    window.location.pathname.toLowerCase() !== "/login"
  ) {
    window.location.replace("/LogIn");
  }
};
