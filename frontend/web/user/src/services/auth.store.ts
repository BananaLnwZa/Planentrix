import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthState, AuthUser } from "@/interfaces/auth.interface";
import authService from "@/services/auth.service";

interface AuthStore extends AuthState {
  // Actions
  setUser: (user: AuthUser | null) => void;
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
      setError: (error) => set({ error }),
      setIsLoading: (isLoading) => set({ isLoading }),

      // Check auth status on initialization
      checkAuthStatus: () => {
        const session = authService.getSession();
        set((state) => ({
          accessToken: session?.token ?? null,
          isAuthenticated: Boolean(session),
          user: session
            ? {
                ...session.user,
                username:
                  state.user?.userId === session.user.userId
                    ? state.user.username
                    : undefined,
              }
            : null,
        }));
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
        } catch (error: unknown) {
          set({
            error: error instanceof Error ? error.message : "Login failed",
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
        } catch (error: unknown) {
          set({
            error:
              error instanceof Error ? error.message : "Registration failed",
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
        } catch {
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
        } catch (error: unknown) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to delete account",
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
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        user: (persistedState as Partial<AuthStore>)?.user ?? null,
        accessToken: null,
        isAuthenticated: false,
      }),
    }
  )
);
