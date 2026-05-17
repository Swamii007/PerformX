import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "employee" | "manager" | "admin";
  department?: string;
  manager_id?: string;
  manager_name?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("performx_token", token);
          localStorage.setItem("performx_user", JSON.stringify(user));
        }
        set({ user, token, isAuthenticated: true });
      },
      clearAuth: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("performx_token");
          localStorage.removeItem("performx_user");
        }
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: "performx-auth",
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
