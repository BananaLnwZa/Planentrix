import axios from "axios";
import { expireAuthSession, getStoredAuthSession } from "./auth.session";
import { getApiBaseURL } from "./api.config";

const clientOptions = {
  baseURL: getApiBaseURL(),
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
