import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthState, AuthUser } from "@/interfaces/auth.interface";
import authService from "@/services/auth.service";
import Cookies from "js-cookie";

interface AuthStore extends AuthState {
  // Actions
  setUser: (user: AuthUser | null) => void;
  setAccessToken: (token: string | null) => void;
  setError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;

  // Async actions
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    password: string,
    birthdate?: string,
    gender?: "male" | "female" | "other"
  ) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  checkAuthStatus: () => void;
  resetAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Setters
      setUser: (user) => set({ user }),
      setAccessToken: (accessToken) =>
        set({ accessToken, isAuthenticated: !!accessToken }),
      setError: (error) => set({ error }),
      setIsLoading: (isLoading) => set({ isLoading }),

      // Check auth status on initialization
      checkAuthStatus: () => {
        const accessToken = Cookies.get("accessToken");
        if (accessToken) {
          set({
            accessToken,
            isAuthenticated: true,
          });
        }
      },

      // Login
      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login({
            user_name: username,
            user_password: password,
            platform: "web",
          });

          set({
            user: {
              userId: response.userId,
              role: response.role,
              username: username,
            },
            accessToken: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            error: error.message || "Login failed",
            isLoading: false,
          });
          throw error;
        }
      },

      // Register
      register: async (username, password, birthdate, gender) => {
        set({ isLoading: true, error: null });
        try {
          await authService.register({
            user_name: username,
            user_password: password,
            user_birthdate: birthdate,
            user_gender: gender,
          });

          set({
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            error: error.message || "Registration failed",
            isLoading: false,
          });
          throw error;
        }
      },

      // Logout
      logout: async () => {
        set({ isLoading: true, error: null });
        try {
          await authService.logout();

          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          // Still clear state even if logout request fails
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            error: null,
            isLoading: false,
          });
        }
      },

      // Delete account
      deleteAccount: async () => {
        set({ isLoading: true, error: null });
        try {
          await authService.deleteAccount();

          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            error: error.message || "Failed to delete account",
            isLoading: false,
          });
          throw error;
        }
      },

      // Reset auth
      resetAuth: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        authService.clearAuth();
      },
    }),
    {
      name: "auth-store",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
