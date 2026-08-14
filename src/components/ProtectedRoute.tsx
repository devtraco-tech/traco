import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  loginPath?: string;
}

export const ProtectedRoute = ({ children, loginPath = "/auth" }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    // Persist the intended destination so Auth.tsx can redirect after login
    sessionStorage.setItem("redirectAfterLogin", location.pathname);
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  return <>{children}</>;
};
