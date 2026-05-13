import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "./router";
import { useAuthStore } from "./store/authStore";
import { authApi } from "./api/auth";
import { ThemeProvider } from "./hooks/use-theme";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
});

// AuthProvider handles user session initialization on application load
function AuthProvider({ children }: { children: React.ReactNode }) {

  const { isAuthenticated, user, setUser, logout } = useAuthStore();
  const [loading, setLoading] = useState(isAuthenticated && !user);

  useEffect(() => {
    let mounted = true;
    async function initAuth() {
      if (isAuthenticated && !user) {
        try {
          const res = await authApi.me();
          if (mounted) setUser(res.data);
        } catch {
          if (mounted) logout();
        } finally {
          if (mounted) setLoading(false);
        }
      } else {
        if (mounted) setLoading(false);
      }
    }
    initAuth();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user, setUser, logout]);

  if (loading) return null; // Hide routes until user role is evaluated

  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
