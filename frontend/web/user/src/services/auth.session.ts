import Cookies from "js-cookie";
import type { AuthUser } from "@/interfaces/auth.interface";

const ACCESS_TOKEN_COOKIE = "accessToken";
const AUTH_STORE_KEY = "auth-store";
const EXPIRY_CLOCK_SKEW_SECONDS = 5;

interface AccessTokenPayload {
  id?: unknown;
  role?: unknown;
  exp?: unknown;
}

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
  const role = typeof payload?.role === "string" ? payload.role : "";
  const nowSeconds = Date.now() / 1000;

  if (
    !Number.isInteger(userId) ||
    userId <= 0 ||
    !Number.isFinite(expiresAtSeconds) ||
    expiresAtSeconds <= nowSeconds + EXPIRY_CLOCK_SKEW_SECONDS ||
    !role
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
  Cookies.remove(ACCESS_TOKEN_COOKIE, { path: "/" });

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
    path: "/",
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
