import axios from "axios";
import { expireAuthSession, getStoredAuthSession } from "./auth.session";

const clientOptions = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  timeout: 10000,
};

export const publicApiClient = axios.create(clientOptions);
export const authenticatedApiClient = axios.create(clientOptions);

authenticatedApiClient.interceptors.request.use((config) => {
  const session = getStoredAuthSession();

  if (!session) {
    expireAuthSession();
    return Promise.reject(new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง"));
  }

  config.headers.Authorization = `Bearer ${session.token}`;
  return config;
});

authenticatedApiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      expireAuthSession();
    }

    return Promise.reject(error);
  }
);
